/**
 * Local file-based storage adapter for when database is unavailable
 * Uses a JSON file to persist tasks (works with server actions)
 *
 * TO REMOVE THIS FEATURE: Delete this file (see feature-flags.ts for full instructions)
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import {
  ITaskStorage,
  StorageTask,
  StorageTaskIndicator,
  CreateTaskData,
  UpdateTaskData,
  TaskWhereInput,
  CalendarWhereInput,
} from "./types";

const STORAGE_FILE = join(process.cwd(), ".local-tasks.json");

interface StorageData {
  tasks: StorageTask[];
}

function generateId(): string {
  return crypto.randomUUID();
}

function readStorage(): StorageData {
  if (!existsSync(STORAGE_FILE)) {
    return { tasks: [] };
  }
  try {
    const data = readFileSync(STORAGE_FILE, "utf-8");
    const parsed = JSON.parse(data) as StorageData;
    // Convert date strings back to Date objects
    parsed.tasks = parsed.tasks.map((task) => ({
      ...task,
      createdAt: new Date(task.createdAt),
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
      deadline: task.deadline ? new Date(task.deadline) : null,
    }));
    return parsed;
  } catch {
    return { tasks: [] };
  }
}

function writeStorage(data: StorageData): void {
  writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function isDateInRange(date: Date | null, range: { gte: Date; lte: Date }): boolean {
  if (!date) return false;
  return date >= range.gte && date <= range.lte;
}

export const localStorageAdapter: ITaskStorage = {
  async create(data: CreateTaskData): Promise<StorageTask> {
    const storage = readStorage();
    const task: StorageTask = {
      id: generateId(),
      title: data.title,
      createdAt: new Date(),
      dueDate: data.dueDate,
      priority: data.priority,
      completed: false,
      estimatedMinutes: data.estimatedMinutes,
      deadline: data.deadline,
    };
    storage.tasks.unshift(task);
    writeStorage(storage);
    return task;
  },

  async delete(id: string): Promise<void> {
    const storage = readStorage();
    storage.tasks = storage.tasks.filter((t) => t.id !== id);
    writeStorage(storage);
  },

  async update(id: string, data: UpdateTaskData): Promise<StorageTask> {
    const storage = readStorage();
    const index = storage.tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error(`Task not found: ${id}`);
    }
    const task = storage.tasks[index];
    if (data.dueDate !== undefined) {
      task.dueDate = data.dueDate;
    }
    if (data.priority !== undefined) {
      task.priority = data.priority;
    }
    if (data.completed !== undefined) {
      task.completed = data.completed;
    }
    writeStorage(storage);
    return task;
  },

  async findMany(where?: TaskWhereInput): Promise<StorageTask[]> {
    const storage = readStorage();
    let tasks = storage.tasks;

    if (where) {
      if (where.completed !== undefined) {
        tasks = tasks.filter((t) => t.completed === where.completed);
      }
      if (where.dueDate) {
        tasks = tasks.filter((t) => isDateInRange(t.dueDate, where.dueDate!));
      }
      if (where.createdAt) {
        tasks = tasks.filter((t) => isDateInRange(t.createdAt, where.createdAt!));
      }
    }

    // Sort by createdAt descending
    return tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async findManyForCalendar(where: CalendarWhereInput): Promise<StorageTaskIndicator[]> {
    const storage = readStorage();
    const { start, end } = where.dateRange;

    return storage.tasks
      .filter((task) => {
        const dueDateInRange = task.dueDate && task.dueDate >= start && task.dueDate <= end;
        const createdAtInRange = task.createdAt >= start && task.createdAt <= end;
        return dueDateInRange || createdAtInRange;
      })
      .map((task) => ({
        id: task.id,
        createdAt: task.createdAt,
        dueDate: task.dueDate,
      }));
  },

  async isAvailable(): Promise<boolean> {
    return true; // File storage is always available
  },
};
