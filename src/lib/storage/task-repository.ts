/**
 * Task repository that switches between Prisma and local storage
 * based on feature flag and database availability
 *
 * TO REMOVE THIS FEATURE: Delete this file (see feature-flags.ts for full instructions)
 */

import { prisma } from "@/lib/prisma";
import { localStorageAdapter } from "./local-storage-adapter";
import { ENABLE_LOCAL_STORAGE_FALLBACK } from "./feature-flags";
import {
  ITaskStorage,
  StorageTask,
  StorageTaskIndicator,
  CreateTaskData,
  UpdateTaskData,
  TaskWhereInput,
  CalendarWhereInput,
  StoragePriority,
} from "./types";

let dbAvailable: boolean | null = null;
let lastDbCheck: number = 0;
const DB_CHECK_INTERVAL = 30000; // Re-check DB every 30 seconds

async function checkDbConnection(): Promise<boolean> {
  const now = Date.now();
  if (dbAvailable !== null && now - lastDbCheck < DB_CHECK_INTERVAL) {
    return dbAvailable;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbAvailable = true;
  } catch {
    dbAvailable = false;
    if (ENABLE_LOCAL_STORAGE_FALLBACK) {
      console.warn("[Storage] Database unavailable, using local storage fallback");
    }
  }
  lastDbCheck = now;
  return dbAvailable;
}

async function shouldUseLocalStorage(): Promise<boolean> {
  if (!ENABLE_LOCAL_STORAGE_FALLBACK) {
    return false;
  }
  const isDbAvailable = await checkDbConnection();
  return !isDbAvailable;
}

// Helper to convert Prisma task to StorageTask
function toStorageTask(task: {
  id: string;
  title: string;
  createdAt: Date;
  dueDate: Date | null;
  priority: string;
  completed: boolean;
  estimatedMinutes: number;
  deadline: Date | null;
}): StorageTask {
  return {
    ...task,
    priority: task.priority as StoragePriority,
  };
}

export const taskRepository: ITaskStorage = {
  async create(data: CreateTaskData): Promise<StorageTask> {
    if (await shouldUseLocalStorage()) {
      return localStorageAdapter.create(data);
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        dueDate: data.dueDate,
        priority: data.priority,
        estimatedMinutes: data.estimatedMinutes,
        deadline: data.deadline,
      },
    });
    return toStorageTask(task);
  },

  async delete(id: string): Promise<void> {
    if (await shouldUseLocalStorage()) {
      return localStorageAdapter.delete(id);
    }

    await prisma.task.delete({
      where: { id },
    });
  },

  async update(id: string, data: UpdateTaskData): Promise<StorageTask> {
    if (await shouldUseLocalStorage()) {
      return localStorageAdapter.update(id, data);
    }

    const task = await prisma.task.update({
      where: { id },
      data,
    });
    return toStorageTask(task);
  },

  async findMany(where?: TaskWhereInput): Promise<StorageTask[]> {
    if (await shouldUseLocalStorage()) {
      return localStorageAdapter.findMany(where);
    }

    const prismaWhere: {
      completed?: boolean;
      dueDate?: { gte: Date; lte: Date };
      createdAt?: { gte: Date; lte: Date };
    } = {};

    if (where?.completed !== undefined) {
      prismaWhere.completed = where.completed;
    }
    if (where?.dueDate) {
      prismaWhere.dueDate = where.dueDate;
    }
    if (where?.createdAt) {
      prismaWhere.createdAt = where.createdAt;
    }

    const tasks = await prisma.task.findMany({
      where: prismaWhere,
      orderBy: { createdAt: "desc" },
    });

    return tasks.map(toStorageTask);
  },

  async findManyForCalendar(where: CalendarWhereInput): Promise<StorageTaskIndicator[]> {
    if (await shouldUseLocalStorage()) {
      return localStorageAdapter.findManyForCalendar(where);
    }

    const { start, end } = where.dateRange;

    return prisma.task.findMany({
      where: {
        OR: [
          { dueDate: { gte: start, lte: end } },
          { createdAt: { gte: start, lte: end } },
        ],
      },
      select: {
        id: true,
        createdAt: true,
        dueDate: true,
      },
    });
  },

  async isAvailable(): Promise<boolean> {
    if (await shouldUseLocalStorage()) {
      return localStorageAdapter.isAvailable();
    }
    return checkDbConnection();
  },
};
