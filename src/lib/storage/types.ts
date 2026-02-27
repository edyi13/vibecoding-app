/**
 * Storage types for the local storage fallback feature
 *
 * TO REMOVE THIS FEATURE: Delete this file (see feature-flags.ts for full instructions)
 */

export type StoragePriority = "LOW" | "MEDIUM" | "HIGH";

export interface StorageTask {
  id: string;
  title: string;
  createdAt: Date;
  dueDate: Date | null;
  priority: StoragePriority;
  completed: boolean;
  estimatedMinutes: number;
  deadline: Date | null;
}

export interface StorageTaskIndicator {
  id: string;
  createdAt: Date;
  dueDate: Date | null;
}

export interface CreateTaskData {
  title: string;
  dueDate: Date | null;
  priority: StoragePriority;
  estimatedMinutes: number;
  deadline: Date | null;
}

export interface UpdateTaskData {
  dueDate?: Date | null;
  priority?: StoragePriority;
  completed?: boolean;
}

export interface TaskWhereInput {
  completed?: boolean;
  dueDate?: { gte: Date; lte: Date };
  createdAt?: { gte: Date; lte: Date };
}

export interface CalendarWhereInput {
  dateRange: { start: Date; end: Date };
}

export interface ITaskStorage {
  create(data: CreateTaskData): Promise<StorageTask>;
  delete(id: string): Promise<void>;
  update(id: string, data: UpdateTaskData): Promise<StorageTask>;
  findMany(where?: TaskWhereInput): Promise<StorageTask[]>;
  findManyForCalendar(where: CalendarWhereInput): Promise<StorageTaskIndicator[]>;
  isAvailable(): Promise<boolean>;
}
