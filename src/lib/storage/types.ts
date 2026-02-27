import type { Priority } from "@prisma/client";

export interface Task {
  id: string;
  title: string;
  createdAt: Date;
  dueDate: Date | null;
  priority: Priority;
  completed: boolean;
  estimatedMinutes: number;
  deadline: Date | null;
}

export interface TaskIndicator {
  id: string;
  createdAt: Date;
  dueDate: Date | null;
}

export interface CreateTaskInput {
  title: string;
  dueDate: Date | null;
  priority: Priority;
  estimatedMinutes: number;
  deadline: Date | null;
}

export interface UpdateTaskInput {
  dueDate?: Date | null;
  priority?: Priority;
  completed?: boolean;
}

export interface TaskFilter {
  completed?: boolean;
  dueDate?: { gte: Date; lte: Date };
  createdAt?: { gte: Date; lte: Date };
}
