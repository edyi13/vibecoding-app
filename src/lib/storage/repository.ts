import { prisma } from "@/lib/prisma";
import { PrismaClientInitializationError, PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { jsonAdapter } from "./json-adapter";
import type { Task, TaskIndicator, CreateTaskInput, UpdateTaskInput, TaskFilter } from "./types";

let dbAvailable = true;
let lastFailTime = 0;
const CACHE_TTL_MS = 30_000;

function isConnectivityError(err: unknown): boolean {
  if (err instanceof PrismaClientInitializationError) return true;
  if (err instanceof PrismaClientKnownRequestError) {
    return ["P1000", "P1001", "P1002", "P1017"].includes(err.code);
  }
  return false;
}

function markDbDown(): void {
  dbAvailable = false;
  lastFailTime = Date.now();
}

function isDbAvailable(): boolean {
  if (dbAvailable) return true;
  if (Date.now() - lastFailTime > CACHE_TTL_MS) {
    dbAvailable = true;
  }
  return dbAvailable;
}

export const taskRepository = {
  async create(data: CreateTaskInput): Promise<Task> {
    if (isDbAvailable()) {
      try {
        return await prisma.task.create({ data }) as Task;
      } catch (err) {
        if (!isConnectivityError(err)) throw err;
        markDbDown();
        console.warn("DB unavailable, falling back to local JSON storage");
      }
    }
    return jsonAdapter.create(data);
  },

  async delete(id: string): Promise<void> {
    if (isDbAvailable()) {
      try {
        await prisma.task.delete({ where: { id } });
        return;
      } catch (err) {
        if (!isConnectivityError(err)) throw err;
        markDbDown();
        console.warn("DB unavailable, falling back to local JSON storage");
      }
    }
    jsonAdapter.delete(id);
  },

  async update(id: string, data: UpdateTaskInput): Promise<Task> {
    if (isDbAvailable()) {
      try {
        return await prisma.task.update({ where: { id }, data }) as Task;
      } catch (err) {
        if (!isConnectivityError(err)) throw err;
        markDbDown();
        console.warn("DB unavailable, falling back to local JSON storage");
      }
    }
    return jsonAdapter.update(id, data);
  },

  async findMany(filter: TaskFilter): Promise<Task[]> {
    if (isDbAvailable()) {
      try {
        return await prisma.task.findMany({
          where: filter,
          orderBy: { createdAt: "desc" },
        }) as Task[];
      } catch (err) {
        if (!isConnectivityError(err)) throw err;
        markDbDown();
        console.warn("DB unavailable, falling back to local JSON storage");
      }
    }
    return jsonAdapter.findMany(filter);
  },

  async findManyForCalendar(start: Date, end: Date): Promise<TaskIndicator[]> {
    if (isDbAvailable()) {
      try {
        return await prisma.task.findMany({
          where: {
            OR: [
              { dueDate: { gte: start, lte: end } },
              { createdAt: { gte: start, lte: end } },
            ],
          },
          select: { id: true, createdAt: true, dueDate: true },
        });
      } catch (err) {
        if (!isConnectivityError(err)) throw err;
        markDbDown();
        console.warn("DB unavailable, falling back to local JSON storage");
      }
    }
    return jsonAdapter.findManyForCalendar(start, end);
  },
};
