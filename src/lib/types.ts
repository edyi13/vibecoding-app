import { Priority } from "@prisma/client";

export type { Priority };

export interface Task {
  id: string;
  title: string;
  createdAt: Date;
  dueDate: Date | null;
  priority: Priority;
  completed: boolean;
}

export interface TaskIndicator {
  id: string;
  createdAt: Date;
  dueDate: Date | null;
}
