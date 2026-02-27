import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { localStorageAdapter } from "./local-storage-adapter";
import type { CreateTaskData, StorageTask } from "./types";

const TEST_STORAGE_FILE = join(process.cwd(), ".local-tasks.json");

describe("localStorageAdapter", () => {
  beforeEach(() => {
    // Clean up any existing test file
    if (existsSync(TEST_STORAGE_FILE)) {
      unlinkSync(TEST_STORAGE_FILE);
    }
  });

  afterEach(() => {
    // Clean up after tests
    if (existsSync(TEST_STORAGE_FILE)) {
      unlinkSync(TEST_STORAGE_FILE);
    }
  });

  describe("create", () => {
    it("creates a new task with generated id", async () => {
      const taskData: CreateTaskData = {
        title: "Test Task",
        dueDate: new Date(2024, 5, 15),
        priority: "MEDIUM",
        estimatedMinutes: 60,
        deadline: null,
      };

      const task = await localStorageAdapter.create(taskData);

      expect(task.id).toBeDefined();
      expect(task.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(task.title).toBe("Test Task");
      expect(task.priority).toBe("MEDIUM");
      expect(task.completed).toBe(false);
    });

    it("sets createdAt to current time", async () => {
      const before = new Date();
      const task = await localStorageAdapter.create({
        title: "Test",
        dueDate: null,
        priority: "LOW",
        estimatedMinutes: 30,
        deadline: null,
      });
      const after = new Date();

      expect(task.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(task.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("persists task to storage file", async () => {
      await localStorageAdapter.create({
        title: "Persistent Task",
        dueDate: null,
        priority: "HIGH",
        estimatedMinutes: 45,
        deadline: null,
      });

      expect(existsSync(TEST_STORAGE_FILE)).toBe(true);
      const data = JSON.parse(readFileSync(TEST_STORAGE_FILE, "utf-8"));
      expect(data.tasks).toHaveLength(1);
      expect(data.tasks[0].title).toBe("Persistent Task");
    });

    it("adds new tasks at the beginning of the list", async () => {
      await localStorageAdapter.create({
        title: "First Task",
        dueDate: null,
        priority: "LOW",
        estimatedMinutes: 30,
        deadline: null,
      });
      await localStorageAdapter.create({
        title: "Second Task",
        dueDate: null,
        priority: "LOW",
        estimatedMinutes: 30,
        deadline: null,
      });

      const tasks = await localStorageAdapter.findMany();
      expect(tasks[0].title).toBe("Second Task");
      expect(tasks[1].title).toBe("First Task");
    });
  });

  describe("delete", () => {
    it("removes task by id", async () => {
      const task = await localStorageAdapter.create({
        title: "To Delete",
        dueDate: null,
        priority: "LOW",
        estimatedMinutes: 30,
        deadline: null,
      });

      await localStorageAdapter.delete(task.id);

      const tasks = await localStorageAdapter.findMany();
      expect(tasks).toHaveLength(0);
    });

    it("does not affect other tasks", async () => {
      const task1 = await localStorageAdapter.create({
        title: "Keep",
        dueDate: null,
        priority: "LOW",
        estimatedMinutes: 30,
        deadline: null,
      });
      const task2 = await localStorageAdapter.create({
        title: "Delete",
        dueDate: null,
        priority: "LOW",
        estimatedMinutes: 30,
        deadline: null,
      });

      await localStorageAdapter.delete(task2.id);

      const tasks = await localStorageAdapter.findMany();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe(task1.id);
    });
  });

  describe("update", () => {
    it("updates task priority", async () => {
      const task = await localStorageAdapter.create({
        title: "Update Priority",
        dueDate: null,
        priority: "LOW",
        estimatedMinutes: 30,
        deadline: null,
      });

      const updated = await localStorageAdapter.update(task.id, {
        priority: "HIGH",
      });

      expect(updated.priority).toBe("HIGH");
      expect(updated.title).toBe("Update Priority");
    });

    it("updates task completed status", async () => {
      const task = await localStorageAdapter.create({
        title: "Toggle Complete",
        dueDate: null,
        priority: "MEDIUM",
        estimatedMinutes: 30,
        deadline: null,
      });

      const updated = await localStorageAdapter.update(task.id, {
        completed: true,
      });

      expect(updated.completed).toBe(true);
    });

    it("updates task dueDate", async () => {
      const task = await localStorageAdapter.create({
        title: "Update Due Date",
        dueDate: null,
        priority: "MEDIUM",
        estimatedMinutes: 30,
        deadline: null,
      });

      const newDueDate = new Date(2024, 11, 25);
      const updated = await localStorageAdapter.update(task.id, {
        dueDate: newDueDate,
      });

      expect(updated.dueDate).toEqual(newDueDate);
    });

    it("can set dueDate to null", async () => {
      const task = await localStorageAdapter.create({
        title: "Remove Due Date",
        dueDate: new Date(2024, 5, 15),
        priority: "MEDIUM",
        estimatedMinutes: 30,
        deadline: null,
      });

      const updated = await localStorageAdapter.update(task.id, {
        dueDate: null,
      });

      expect(updated.dueDate).toBeNull();
    });

    it("throws error for non-existent task", async () => {
      await expect(
        localStorageAdapter.update("non-existent-id", { completed: true })
      ).rejects.toThrow("Task not found");
    });

    it("persists updates to storage file", async () => {
      const task = await localStorageAdapter.create({
        title: "Persist Update",
        dueDate: null,
        priority: "LOW",
        estimatedMinutes: 30,
        deadline: null,
      });

      await localStorageAdapter.update(task.id, { priority: "HIGH" });

      const data = JSON.parse(readFileSync(TEST_STORAGE_FILE, "utf-8"));
      expect(data.tasks[0].priority).toBe("HIGH");
    });
  });

  describe("findMany", () => {
    beforeEach(async () => {
      // Create test tasks
      await localStorageAdapter.create({
        title: "Completed Task",
        dueDate: new Date(2024, 5, 15),
        priority: "LOW",
        estimatedMinutes: 30,
        deadline: null,
      });
      const completedTask = (await localStorageAdapter.findMany())[0];
      await localStorageAdapter.update(completedTask.id, { completed: true });

      await localStorageAdapter.create({
        title: "Pending Task",
        dueDate: new Date(2024, 5, 16),
        priority: "HIGH",
        estimatedMinutes: 60,
        deadline: null,
      });
    });

    it("returns all tasks when no filter", async () => {
      const tasks = await localStorageAdapter.findMany();
      expect(tasks).toHaveLength(2);
    });

    it("filters by completed status", async () => {
      const completedTasks = await localStorageAdapter.findMany({
        completed: true,
      });
      expect(completedTasks).toHaveLength(1);
      expect(completedTasks[0].title).toBe("Completed Task");

      const pendingTasks = await localStorageAdapter.findMany({
        completed: false,
      });
      expect(pendingTasks).toHaveLength(1);
      expect(pendingTasks[0].title).toBe("Pending Task");
    });

    it("filters by dueDate range", async () => {
      const tasks = await localStorageAdapter.findMany({
        dueDate: {
          gte: new Date(2024, 5, 15, 0, 0, 0),
          lte: new Date(2024, 5, 15, 23, 59, 59),
        },
      });
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe("Completed Task");
    });

    it("returns tasks sorted by createdAt descending", async () => {
      const tasks = await localStorageAdapter.findMany();
      // Most recent first
      expect(tasks[0].title).toBe("Pending Task");
      expect(tasks[1].title).toBe("Completed Task");
    });

    it("returns empty array when no tasks match", async () => {
      const tasks = await localStorageAdapter.findMany({
        dueDate: {
          gte: new Date(2025, 0, 1),
          lte: new Date(2025, 0, 31),
        },
      });
      expect(tasks).toHaveLength(0);
    });
  });

  describe("findManyForCalendar", () => {
    it("returns tasks within date range based on dueDate or createdAt", async () => {
      // Task with dueDate in range
      await localStorageAdapter.create({
        title: "Due In Range",
        dueDate: new Date(2024, 5, 15),
        priority: "MEDIUM",
        estimatedMinutes: 30,
        deadline: null,
      });

      // Current date will be used for createdAt, so let's use a date range that includes today
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // Task created now (createdAt will be current time)
      await localStorageAdapter.create({
        title: "Created Now",
        dueDate: null,
        priority: "LOW",
        estimatedMinutes: 30,
        deadline: null,
      });

      const tasks = await localStorageAdapter.findManyForCalendar({
        dateRange: {
          start: startOfMonth,
          end: endOfMonth,
        },
      });

      // Should find at least the task created now (which has createdAt in the current month)
      expect(tasks.length).toBeGreaterThanOrEqual(1);
      expect(tasks.some(t => t.dueDate === null)).toBe(true); // The "Created Now" task
    });

    it("returns only id, createdAt, and dueDate", async () => {
      await localStorageAdapter.create({
        title: "Full Task",
        dueDate: new Date(2024, 5, 15),
        priority: "HIGH",
        estimatedMinutes: 120,
        deadline: null,
      });

      const tasks = await localStorageAdapter.findManyForCalendar({
        dateRange: {
          start: new Date(2024, 5, 1),
          end: new Date(2024, 5, 30),
        },
      });

      expect(tasks[0]).toHaveProperty("id");
      expect(tasks[0]).toHaveProperty("createdAt");
      expect(tasks[0]).toHaveProperty("dueDate");
      expect(tasks[0]).not.toHaveProperty("title");
      expect(tasks[0]).not.toHaveProperty("priority");
    });
  });

  describe("isAvailable", () => {
    it("always returns true", async () => {
      const available = await localStorageAdapter.isAvailable();
      expect(available).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty storage file gracefully", async () => {
      writeFileSync(TEST_STORAGE_FILE, "", "utf-8");

      // Should not throw, should return empty array
      const result = await localStorageAdapter.findMany();
      expect(result).toEqual([]);
    });

    it("handles corrupted JSON gracefully", async () => {
      writeFileSync(TEST_STORAGE_FILE, "{ invalid json }", "utf-8");

      // Should not throw, should return empty array
      const result = await localStorageAdapter.findMany();
      expect(result).toEqual([]);
    });

    it("handles missing storage file", async () => {
      // File doesn't exist
      const tasks = await localStorageAdapter.findMany();
      expect(tasks).toEqual([]);
    });

    it("preserves date objects through serialization", async () => {
      const dueDate = new Date(2024, 5, 15, 14, 30, 0);
      await localStorageAdapter.create({
        title: "Date Test",
        dueDate,
        priority: "MEDIUM",
        estimatedMinutes: 30,
        deadline: new Date(2024, 5, 20),
      });

      const tasks = await localStorageAdapter.findMany();
      expect(tasks[0].dueDate).toBeInstanceOf(Date);
      expect(tasks[0].dueDate?.getTime()).toBe(dueDate.getTime());
      expect(tasks[0].createdAt).toBeInstanceOf(Date);
    });
  });
});
