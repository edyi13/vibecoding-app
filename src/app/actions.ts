"use server";

import { taskRepository, StoragePriority } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { startOfDay, endOfDay } from "date-fns";
import { parseTaskWithAI } from "@/lib/ai-parser";

// Re-export Priority type for backward compatibility
export type Priority = StoragePriority;

export type ActionResult = { success: true } | { success: false; error: string };

export async function addTask(formData: FormData): Promise<ActionResult> {
  const rawTitle = formData.get("title") as string;
  const dueDateStr = formData.get("dueDate") as string;
  const dueTimeStr = formData.get("dueTime") as string;
  const priorityStr = formData.get("priority") as string;

  if (!rawTitle || rawTitle.trim() === "") {
    return { success: false, error: "Task title is required" };
  }

  // Parse task with AI
  let parsedTask;
  try {
    parsedTask = await parseTaskWithAI(rawTitle.trim());
  } catch (error) {
    console.error("AI parsing failed:", error);
    // Fallback to raw input if AI fails
    parsedTask = {
      cleanedTitle: rawTitle.trim(),
      estimatedMinutes: 60,
      deadline: null,
      priority: "MEDIUM" as const,
    };
  }

  // User-provided values override AI-extracted values
  let dueDate: Date | null = null;
  if (dueDateStr) {
    // User explicitly set a due date
    const timeComponent = dueTimeStr || "00:00";
    dueDate = new Date(`${dueDateStr}T${timeComponent}:00`);
  }

  // AI-extracted deadline (separate from user-set dueDate)
  let deadline: Date | null = null;
  if (parsedTask.deadline) {
    deadline = new Date(parsedTask.deadline + "T00:00:00");
  }

  // User-selected priority overrides AI if explicitly set
  const priority = priorityStr
    ? (priorityStr as Priority)
    : (parsedTask.priority as Priority);

  try {
    await taskRepository.create({
      title: parsedTask.cleanedTitle,
      dueDate,
      priority,
      estimatedMinutes: parsedTask.estimatedMinutes,
      deadline,
    });
  } catch (error) {
    console.error("Failed to create task:", error);
    return { success: false, error: "Failed to create task" };
  }

  revalidatePath("/");
  return { success: true };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  try {
    await taskRepository.delete(id);
  } catch (error) {
    console.error("Failed to delete task:", error);
    return { success: false, error: "Failed to delete task" };
  }

  revalidatePath("/");
  return { success: true };
}

export async function updateTask(
  id: string,
  data: { dueDate?: string | null; dueTime?: string | null; priority?: StoragePriority }
): Promise<ActionResult> {
  const updateData: { dueDate?: Date | null; priority?: StoragePriority } = {};

  if (data.dueDate !== undefined) {
    if (data.dueDate) {
      const timeComponent = data.dueTime || "00:00";
      updateData.dueDate = new Date(`${data.dueDate}T${timeComponent}:00`);
    } else {
      updateData.dueDate = null;
    }
  }

  if (data.priority !== undefined) {
    updateData.priority = data.priority;
  }

  try {
    await taskRepository.update(id, updateData);
  } catch (error) {
    console.error("Failed to update task:", error);
    return { success: false, error: "Failed to update task" };
  }

  revalidatePath("/");
  return { success: true };
}

export async function toggleTaskCompleted(id: string, completed: boolean): Promise<ActionResult> {
  try {
    await taskRepository.update(id, { completed });
  } catch (error) {
    console.error("Failed to toggle task:", error);
    return { success: false, error: "Failed to update task" };
  }

  revalidatePath("/");
  return { success: true };
}

export type DateFilterMode = "due" | "created";

export async function getTasks(
  filterDate?: string,
  completed?: boolean,
  filterBy: DateFilterMode = "due"
) {
  const where: {
    completed?: boolean;
    dueDate?: { gte: Date; lte: Date };
    createdAt?: { gte: Date; lte: Date };
  } = {};

  if (completed !== undefined) {
    where.completed = completed;
  }

  if (filterDate) {
    const date = new Date(filterDate + "T00:00:00");
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    if (filterBy === "due") {
      where.dueDate = {
        gte: dayStart,
        lte: dayEnd,
      };
    } else {
      where.createdAt = {
        gte: dayStart,
        lte: dayEnd,
      };
    }
  }

  return taskRepository.findMany(where);
}

export async function getTasksForCalendar(year: number, month: number) {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59);

  return taskRepository.findManyForCalendar({
    dateRange: { start: startDate, end: endDate },
  });
}
