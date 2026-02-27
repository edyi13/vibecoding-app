import fs from "fs";
import path from "path";
import type { Task, TaskIndicator, CreateTaskInput, UpdateTaskInput, TaskFilter } from "./types";

const FILE_PATH = path.join(process.cwd(), ".local-tasks.json");

function readAll(): Task[] {
  if (!fs.existsSync(FILE_PATH)) return [];
  const raw = fs.readFileSync(FILE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
  return parsed.map((t) => ({
    ...t,
    createdAt: new Date(t.createdAt as string),
    dueDate: t.dueDate ? new Date(t.dueDate as string) : null,
    deadline: t.deadline ? new Date(t.deadline as string) : null,
  })) as Task[];
}

function writeAll(tasks: Task[]): void {
  fs.writeFileSync(FILE_PATH, JSON.stringify(tasks, null, 2), "utf-8");
}

export const jsonAdapter = {
  create(data: CreateTaskInput): Task {
    const tasks = readAll();
    const task: Task = {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      completed: false,
      ...data,
    };
    tasks.unshift(task);
    writeAll(tasks);
    return task;
  },

  delete(id: string): void {
    const tasks = readAll().filter((t) => t.id !== id);
    writeAll(tasks);
  },

  update(id: string, data: UpdateTaskInput): Task {
    const tasks = readAll();
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`Task ${id} not found`);
    tasks[idx] = { ...tasks[idx], ...data };
    writeAll(tasks);
    return tasks[idx];
  },

  findMany(filter: TaskFilter): Task[] {
    let tasks = readAll();

    if (filter.completed !== undefined) {
      tasks = tasks.filter((t) => t.completed === filter.completed);
    }

    if (filter.dueDate) {
      const { gte, lte } = filter.dueDate;
      tasks = tasks.filter((t) => t.dueDate && t.dueDate >= gte && t.dueDate <= lte);
    }

    if (filter.createdAt) {
      const { gte, lte } = filter.createdAt;
      tasks = tasks.filter((t) => t.createdAt >= gte && t.createdAt <= lte);
    }

    return tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  findManyForCalendar(start: Date, end: Date): TaskIndicator[] {
    return readAll()
      .filter(
        (t) =>
          (t.dueDate && t.dueDate >= start && t.dueDate <= end) ||
          (t.createdAt >= start && t.createdAt <= end)
      )
      .map(({ id, createdAt, dueDate }) => ({ id, createdAt, dueDate }));
  },
};
