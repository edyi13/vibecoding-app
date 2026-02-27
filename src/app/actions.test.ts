import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Task } from "@/lib/storage/types";

// Mock all dependencies before importing actions
vi.mock("@/lib/storage/repository", () => ({
  taskRepository: {
    create: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    findManyForCalendar: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/ai-parser", () => ({
  parseTaskWithAI: vi.fn(),
}));

// Import after mocking
import { taskRepository } from "@/lib/storage/repository";
import { revalidatePath } from "next/cache";
import { parseTaskWithAI } from "@/lib/ai-parser";
import {
  addTask,
  deleteTask,
  updateTask,
  toggleTaskCompleted,
  getTasks,
  getTasksForCalendar,
} from "./actions";

const mockRepo = vi.mocked(taskRepository);
const mockRevalidatePath = vi.mocked(revalidatePath);
const mockParseTaskWithAI = vi.mocked(parseTaskWithAI);

describe("Server Actions", () => {
  const mockTask: Task = {
    id: "test-task-id",
    title: "Test Task",
    createdAt: new Date(2024, 5, 15),
    dueDate: new Date(2024, 5, 20),
    priority: "MEDIUM",
    completed: false,
    estimatedMinutes: 60,
    deadline: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addTask", () => {
    const createFormData = (data: Record<string, string>): FormData => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
      });
      return formData;
    };

    beforeEach(() => {
      mockParseTaskWithAI.mockResolvedValue({
        cleanedTitle: "Cleaned Task Title",
        estimatedMinutes: 45,
        deadline: null,
        priority: "MEDIUM",
      });
      mockRepo.create.mockResolvedValue(mockTask);
    });

    it("creates a task with AI-parsed values", async () => {
      const formData = createFormData({ title: "Buy groceries tomorrow" });

      const result = await addTask(formData);

      expect(result).toEqual({ success: true });
      expect(mockParseTaskWithAI).toHaveBeenCalledWith("Buy groceries tomorrow");
      expect(mockRepo.create).toHaveBeenCalledWith({
        title: "Cleaned Task Title",
        dueDate: null,
        priority: "MEDIUM",
        estimatedMinutes: 45,
        deadline: null,
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/");
    });

    it("returns error when title is empty", async () => {
      const formData = createFormData({ title: "" });

      const result = await addTask(formData);

      expect(result).toEqual({
        success: false,
        error: "Task title is required",
      });
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it("returns error when title is only whitespace", async () => {
      const formData = createFormData({ title: "   " });

      const result = await addTask(formData);

      expect(result).toEqual({
        success: false,
        error: "Task title is required",
      });
    });

    it("user-provided dueDate overrides AI-parsed values", async () => {
      const formData = createFormData({
        title: "Meeting",
        dueDate: "2024-07-15",
        dueTime: "14:30",
      });

      await addTask(formData);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          dueDate: new Date("2024-07-15T14:30:00"),
        })
      );
    });

    it("user-provided priority overrides AI-parsed values", async () => {
      const formData = createFormData({
        title: "Urgent task",
        priority: "HIGH",
      });

      await addTask(formData);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: "HIGH",
        })
      );
    });

    it("uses default time 00:00 when dueTime not provided", async () => {
      const formData = createFormData({
        title: "Task with date only",
        dueDate: "2024-07-15",
      });

      await addTask(formData);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          dueDate: new Date("2024-07-15T00:00:00"),
        })
      );
    });

    it("falls back to defaults when AI parsing fails", async () => {
      mockParseTaskWithAI.mockRejectedValue(new Error("AI service unavailable"));

      const formData = createFormData({ title: "Simple task" });

      const result = await addTask(formData);

      expect(result).toEqual({ success: true });
      expect(mockRepo.create).toHaveBeenCalledWith({
        title: "Simple task",
        dueDate: null,
        priority: "MEDIUM",
        estimatedMinutes: 60,
        deadline: null,
      });
    });

    it("handles AI-extracted deadline", async () => {
      mockParseTaskWithAI.mockResolvedValue({
        cleanedTitle: "Submit report",
        estimatedMinutes: 30,
        deadline: "2024-07-20",
        priority: "HIGH",
      });

      const formData = createFormData({ title: "Submit report by July 20th" });

      await addTask(formData);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deadline: new Date("2024-07-20T00:00:00"),
        })
      );
    });

    it("returns error when repository create fails", async () => {
      mockRepo.create.mockRejectedValue(new Error("DB error"));

      const formData = createFormData({ title: "Failing task" });

      const result = await addTask(formData);

      expect(result).toEqual({
        success: false,
        error: "Failed to create task",
      });
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("deleteTask", () => {
    it("deletes task and revalidates path", async () => {
      mockRepo.delete.mockResolvedValue(undefined);

      const result = await deleteTask("task-to-delete");

      expect(result).toEqual({ success: true });
      expect(mockRepo.delete).toHaveBeenCalledWith("task-to-delete");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/");
    });

    it("returns error when delete fails", async () => {
      mockRepo.delete.mockRejectedValue(new Error("Not found"));

      const result = await deleteTask("non-existent-task");

      expect(result).toEqual({
        success: false,
        error: "Failed to delete task",
      });
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("updateTask", () => {
    beforeEach(() => {
      mockRepo.update.mockResolvedValue(mockTask);
    });

    it("updates task priority", async () => {
      const result = await updateTask("task-id", { priority: "HIGH" });

      expect(result).toEqual({ success: true });
      expect(mockRepo.update).toHaveBeenCalledWith("task-id", { priority: "HIGH" });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/");
    });

    it("updates task dueDate with time", async () => {
      await updateTask("task-id", {
        dueDate: "2024-08-15",
        dueTime: "10:30",
      });

      expect(mockRepo.update).toHaveBeenCalledWith("task-id", {
        dueDate: new Date("2024-08-15T10:30:00"),
      });
    });

    it("updates task dueDate without time defaults to midnight", async () => {
      await updateTask("task-id", {
        dueDate: "2024-08-15",
      });

      expect(mockRepo.update).toHaveBeenCalledWith("task-id", {
        dueDate: new Date("2024-08-15T00:00:00"),
      });
    });

    it("clears dueDate when passed null", async () => {
      await updateTask("task-id", {
        dueDate: null,
      });

      expect(mockRepo.update).toHaveBeenCalledWith("task-id", { dueDate: null });
    });

    it("returns error when update fails", async () => {
      mockRepo.update.mockRejectedValue(new Error("Update failed"));

      const result = await updateTask("task-id", { priority: "LOW" });

      expect(result).toEqual({
        success: false,
        error: "Failed to update task",
      });
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("toggleTaskCompleted", () => {
    beforeEach(() => {
      mockRepo.update.mockResolvedValue(mockTask);
    });

    it("toggles task to completed", async () => {
      const result = await toggleTaskCompleted("task-id", true);

      expect(result).toEqual({ success: true });
      expect(mockRepo.update).toHaveBeenCalledWith("task-id", { completed: true });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/");
    });

    it("toggles task to not completed", async () => {
      await toggleTaskCompleted("task-id", false);

      expect(mockRepo.update).toHaveBeenCalledWith("task-id", { completed: false });
    });

    it("returns error when toggle fails", async () => {
      mockRepo.update.mockRejectedValue(new Error("Toggle failed"));

      const result = await toggleTaskCompleted("task-id", true);

      expect(result).toEqual({
        success: false,
        error: "Failed to update task",
      });
    });
  });

  describe("getTasks", () => {
    beforeEach(() => {
      mockRepo.findMany.mockResolvedValue([mockTask]);
    });

    it("returns all tasks when no filters", async () => {
      const tasks = await getTasks();

      expect(tasks).toEqual([mockTask]);
      expect(mockRepo.findMany).toHaveBeenCalledWith({});
    });

    it("filters by completed status", async () => {
      await getTasks(undefined, true);

      expect(mockRepo.findMany).toHaveBeenCalledWith({ completed: true });
    });

    it("filters by due date", async () => {
      await getTasks("2024-06-15", undefined, "due");

      const call = mockRepo.findMany.mock.calls[0][0];
      expect(call.dueDate).toBeDefined();
      expect(call.dueDate!.gte).toBeInstanceOf(Date);
      expect(call.dueDate!.lte).toBeInstanceOf(Date);
    });

    it("filters by created date", async () => {
      await getTasks("2024-06-15", undefined, "created");

      const call = mockRepo.findMany.mock.calls[0][0];
      expect(call.createdAt).toBeDefined();
      expect(call.createdAt!.gte).toBeInstanceOf(Date);
      expect(call.createdAt!.lte).toBeInstanceOf(Date);
    });

    it("combines completed and date filters", async () => {
      await getTasks("2024-06-15", false, "due");

      const call = mockRepo.findMany.mock.calls[0][0];
      expect(call.completed).toBe(false);
      expect(call.dueDate).toBeDefined();
    });

    it("defaults to due date filter mode", async () => {
      await getTasks("2024-06-15");

      const call = mockRepo.findMany.mock.calls[0][0];
      expect(call.dueDate).toBeDefined();
      expect(call.createdAt).toBeUndefined();
    });
  });

  describe("getTasksForCalendar", () => {
    it("returns tasks for specified month", async () => {
      const calendarTasks = [
        { id: "1", createdAt: new Date(), dueDate: new Date() },
      ];
      mockRepo.findManyForCalendar.mockResolvedValue(calendarTasks);

      const result = await getTasksForCalendar(2024, 5); // June 2024

      expect(result).toEqual(calendarTasks);
      expect(mockRepo.findManyForCalendar).toHaveBeenCalledWith(
        new Date(2024, 5, 1),
        new Date(2024, 5, 30, 23, 59, 59)
      );
    });

    it("handles January (month 0)", async () => {
      mockRepo.findManyForCalendar.mockResolvedValue([]);

      await getTasksForCalendar(2024, 0);

      const [start] = mockRepo.findManyForCalendar.mock.calls[0];
      expect(start).toEqual(new Date(2024, 0, 1));
    });

    it("handles December (month 11)", async () => {
      mockRepo.findManyForCalendar.mockResolvedValue([]);

      await getTasksForCalendar(2024, 11);

      const [start] = mockRepo.findManyForCalendar.mock.calls[0];
      expect(start).toEqual(new Date(2024, 11, 1));
    });

    it("calculates correct end date for different months", async () => {
      mockRepo.findManyForCalendar.mockResolvedValue([]);

      // February in a leap year
      await getTasksForCalendar(2024, 1);

      const [, end] = mockRepo.findManyForCalendar.mock.calls[0];
      // February 2024 has 29 days (leap year)
      expect(end.getDate()).toBe(29);
    });
  });
});
