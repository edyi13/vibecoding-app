import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { CreateTaskData, StorageTask, UpdateTaskData } from "./types";

// Mock modules before importing the repository
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    task: {
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("./local-storage-adapter", () => ({
  localStorageAdapter: {
    create: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    findManyForCalendar: vi.fn(),
    isAvailable: vi.fn(),
  },
}));

vi.mock("./feature-flags", () => ({
  ENABLE_LOCAL_STORAGE_FALLBACK: true,
}));

// Import after mocking
import { prisma } from "@/lib/prisma";
import { localStorageAdapter } from "./local-storage-adapter";
import { taskRepository } from "./task-repository";

const mockPrisma = vi.mocked(prisma);
const mockLocalStorage = vi.mocked(localStorageAdapter);

describe("taskRepository", () => {
  const mockTask: StorageTask = {
    id: "test-id-123",
    title: "Test Task",
    createdAt: new Date(2024, 5, 15),
    dueDate: new Date(2024, 5, 20),
    priority: "MEDIUM",
    completed: false,
    estimatedMinutes: 60,
    deadline: null,
  };

  const mockCreateData: CreateTaskData = {
    title: "New Task",
    dueDate: new Date(2024, 5, 20),
    priority: "HIGH",
    estimatedMinutes: 45,
    deadline: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the module state by re-importing
    vi.resetModules();
  });

  describe("when database is available", () => {
    beforeEach(() => {
      // DB is available
      mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    });

    it("create uses Prisma when DB is available", async () => {
      mockPrisma.task.create.mockResolvedValue({
        ...mockTask,
        priority: "HIGH",
      });

      // Need to re-import to reset the cached DB state
      const { taskRepository: repo } = await import("./task-repository");

      const result = await repo.create(mockCreateData);

      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: {
          title: mockCreateData.title,
          dueDate: mockCreateData.dueDate,
          priority: mockCreateData.priority,
          estimatedMinutes: mockCreateData.estimatedMinutes,
          deadline: mockCreateData.deadline,
        },
      });
      expect(mockLocalStorage.create).not.toHaveBeenCalled();
    });

    it("delete uses Prisma when DB is available", async () => {
      mockPrisma.task.delete.mockResolvedValue(mockTask);

      const { taskRepository: repo } = await import("./task-repository");
      await repo.delete("test-id");

      expect(mockPrisma.task.delete).toHaveBeenCalledWith({
        where: { id: "test-id" },
      });
      expect(mockLocalStorage.delete).not.toHaveBeenCalled();
    });

    it("update uses Prisma when DB is available", async () => {
      const updateData: UpdateTaskData = { completed: true };
      mockPrisma.task.update.mockResolvedValue({
        ...mockTask,
        completed: true,
      });

      const { taskRepository: repo } = await import("./task-repository");
      await repo.update("test-id", updateData);

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: "test-id" },
        data: updateData,
      });
      expect(mockLocalStorage.update).not.toHaveBeenCalled();
    });

    it("findMany uses Prisma when DB is available", async () => {
      mockPrisma.task.findMany.mockResolvedValue([mockTask]);

      const { taskRepository: repo } = await import("./task-repository");
      const result = await repo.findMany({ completed: false });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: { completed: false },
        orderBy: { createdAt: "desc" },
      });
      expect(mockLocalStorage.findMany).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it("findManyForCalendar uses Prisma when DB is available", async () => {
      mockPrisma.task.findMany.mockResolvedValue([
        { id: mockTask.id, createdAt: mockTask.createdAt, dueDate: mockTask.dueDate },
      ]);

      const { taskRepository: repo } = await import("./task-repository");
      const dateRange = {
        start: new Date(2024, 5, 1),
        end: new Date(2024, 5, 30),
      };

      await repo.findManyForCalendar({ dateRange });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { dueDate: { gte: dateRange.start, lte: dateRange.end } },
            { createdAt: { gte: dateRange.start, lte: dateRange.end } },
          ],
        },
        select: {
          id: true,
          createdAt: true,
          dueDate: true,
        },
      });
    });
  });

  describe("when database is unavailable and fallback is enabled", () => {
    beforeEach(() => {
      // DB is unavailable
      mockPrisma.$queryRaw.mockRejectedValue(new Error("Connection refused"));
    });

    it("create falls back to local storage", async () => {
      mockLocalStorage.create.mockResolvedValue(mockTask);

      const { taskRepository: repo } = await import("./task-repository");
      await repo.create(mockCreateData);

      expect(mockLocalStorage.create).toHaveBeenCalledWith(mockCreateData);
      expect(mockPrisma.task.create).not.toHaveBeenCalled();
    });

    it("delete falls back to local storage", async () => {
      mockLocalStorage.delete.mockResolvedValue(undefined);

      const { taskRepository: repo } = await import("./task-repository");
      await repo.delete("test-id");

      expect(mockLocalStorage.delete).toHaveBeenCalledWith("test-id");
      expect(mockPrisma.task.delete).not.toHaveBeenCalled();
    });

    it("update falls back to local storage", async () => {
      const updateData: UpdateTaskData = { priority: "HIGH" };
      mockLocalStorage.update.mockResolvedValue({
        ...mockTask,
        priority: "HIGH",
      });

      const { taskRepository: repo } = await import("./task-repository");
      await repo.update("test-id", updateData);

      expect(mockLocalStorage.update).toHaveBeenCalledWith("test-id", updateData);
      expect(mockPrisma.task.update).not.toHaveBeenCalled();
    });

    it("findMany falls back to local storage", async () => {
      mockLocalStorage.findMany.mockResolvedValue([mockTask]);

      const { taskRepository: repo } = await import("./task-repository");
      const result = await repo.findMany({ completed: false });

      expect(mockLocalStorage.findMany).toHaveBeenCalledWith({ completed: false });
      expect(mockPrisma.task.findMany).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it("findManyForCalendar falls back to local storage", async () => {
      mockLocalStorage.findManyForCalendar.mockResolvedValue([
        { id: mockTask.id, createdAt: mockTask.createdAt, dueDate: mockTask.dueDate },
      ]);

      const { taskRepository: repo } = await import("./task-repository");
      const dateRange = {
        start: new Date(2024, 5, 1),
        end: new Date(2024, 5, 30),
      };

      await repo.findManyForCalendar({ dateRange });

      expect(mockLocalStorage.findManyForCalendar).toHaveBeenCalledWith({ dateRange });
    });

    it("isAvailable returns local storage availability when DB is down", async () => {
      mockLocalStorage.isAvailable.mockResolvedValue(true);

      const { taskRepository: repo } = await import("./task-repository");
      const available = await repo.isAvailable();

      expect(available).toBe(true);
      expect(mockLocalStorage.isAvailable).toHaveBeenCalled();
    });
  });

  describe("toStorageTask conversion", () => {
    beforeEach(() => {
      mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    });

    it("converts Prisma task to StorageTask format", async () => {
      const prismaTask = {
        id: "prisma-id",
        title: "Prisma Task",
        createdAt: new Date(2024, 5, 15),
        dueDate: new Date(2024, 5, 20),
        priority: "HIGH",
        completed: false,
        estimatedMinutes: 90,
        deadline: new Date(2024, 5, 25),
      };
      mockPrisma.task.create.mockResolvedValue(prismaTask);

      const { taskRepository: repo } = await import("./task-repository");
      const result = await repo.create(mockCreateData);

      expect(result.id).toBe("prisma-id");
      expect(result.priority).toBe("HIGH");
      expect(result.estimatedMinutes).toBe(90);
    });

    it("maps findMany results correctly", async () => {
      const prismaTasks = [
        {
          id: "1",
          title: "Task 1",
          createdAt: new Date(),
          dueDate: null,
          priority: "LOW",
          completed: false,
          estimatedMinutes: 30,
          deadline: null,
        },
        {
          id: "2",
          title: "Task 2",
          createdAt: new Date(),
          dueDate: new Date(),
          priority: "HIGH",
          completed: true,
          estimatedMinutes: 120,
          deadline: new Date(),
        },
      ];
      mockPrisma.task.findMany.mockResolvedValue(prismaTasks);

      const { taskRepository: repo } = await import("./task-repository");
      const results = await repo.findMany();

      expect(results).toHaveLength(2);
      expect(results[0].priority).toBe("LOW");
      expect(results[1].priority).toBe("HIGH");
    });
  });

  describe("findMany with filters", () => {
    beforeEach(() => {
      mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
      mockPrisma.task.findMany.mockResolvedValue([]);
    });

    it("passes completed filter to Prisma", async () => {
      const { taskRepository: repo } = await import("./task-repository");
      await repo.findMany({ completed: true });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: { completed: true },
        orderBy: { createdAt: "desc" },
      });
    });

    it("passes dueDate filter to Prisma", async () => {
      const dateRange = {
        gte: new Date(2024, 5, 1),
        lte: new Date(2024, 5, 30),
      };

      const { taskRepository: repo } = await import("./task-repository");
      await repo.findMany({ dueDate: dateRange });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: { dueDate: dateRange },
        orderBy: { createdAt: "desc" },
      });
    });

    it("passes createdAt filter to Prisma", async () => {
      const dateRange = {
        gte: new Date(2024, 5, 1),
        lte: new Date(2024, 5, 30),
      };

      const { taskRepository: repo } = await import("./task-repository");
      await repo.findMany({ createdAt: dateRange });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: { createdAt: dateRange },
        orderBy: { createdAt: "desc" },
      });
    });

    it("handles empty filter object", async () => {
      const { taskRepository: repo } = await import("./task-repository");
      await repo.findMany({});

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: "desc" },
      });
    });

    it("handles undefined filter", async () => {
      const { taskRepository: repo } = await import("./task-repository");
      await repo.findMany();

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: "desc" },
      });
    });
  });
});
