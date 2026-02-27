import { taskRepository } from "./repository";

// ---------------------------------------------------------------------------
// Fake Prisma error classes – names must match what isConnectivityError checks
// ---------------------------------------------------------------------------
class PrismaClientInitializationError extends Error {}
class PrismaClientKnownRequestError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Mocks – use vi.hoisted so the values exist when vi.mock factories run
// ---------------------------------------------------------------------------
const mockPrismaTask = vi.hoisted(() => ({
  create: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
  findMany: vi.fn(),
}));

const mockJsonAdapter = vi.hoisted(() => ({
  create: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
  findMany: vi.fn(),
  findManyForCalendar: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { task: mockPrismaTask } }));
vi.mock("./json-adapter", () => ({ jsonAdapter: mockJsonAdapter }));

// ---------------------------------------------------------------------------
// Fake-timer isolation
//
// dbAvailable and lastFailTime are module-level vars that persist across tests.
// Advancing the fake clock by 120 s before each test (well past the 30 s TTL)
// ensures isDbAvailable() always resets the state back to "available".
// ---------------------------------------------------------------------------
let fakeTime = new Date("2025-01-01").getTime();

beforeEach(() => {
  fakeTime += 120_000;
  vi.useFakeTimers();
  vi.setSystemTime(fakeTime);
  vi.clearAllMocks();
});

afterEach(() => vi.useRealTimers());

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const mockTask = {
  id: "task-1",
  title: "Test Task",
  createdAt: new Date("2025-01-01"),
  dueDate: null,
  priority: "MEDIUM" as any,
  completed: false,
  estimatedMinutes: 30,
  deadline: null,
};

const mockCreateInput = {
  title: "Test Task",
  dueDate: null,
  priority: "MEDIUM" as any,
  estimatedMinutes: 30,
  deadline: null,
};

// ===========================================================================
// Tests
// ===========================================================================

describe("taskRepository – happy path (DB available)", () => {
  it("create: calls Prisma and returns result; JSON adapter not called", async () => {
    mockPrismaTask.create.mockResolvedValue(mockTask);

    const result = await taskRepository.create(mockCreateInput);

    expect(mockPrismaTask.create).toHaveBeenCalledWith({ data: mockCreateInput });
    expect(mockJsonAdapter.create).not.toHaveBeenCalled();
    expect(result).toEqual(mockTask);
  });

  it("delete: calls Prisma; JSON adapter not called", async () => {
    mockPrismaTask.delete.mockResolvedValue({});

    await taskRepository.delete("task-1");

    expect(mockPrismaTask.delete).toHaveBeenCalledWith({ where: { id: "task-1" } });
    expect(mockJsonAdapter.delete).not.toHaveBeenCalled();
  });

  it("update: calls Prisma and returns modified task; JSON adapter not called", async () => {
    const updateData = { completed: true };
    mockPrismaTask.update.mockResolvedValue({ ...mockTask, completed: true });

    const result = await taskRepository.update("task-1", updateData);

    expect(mockPrismaTask.update).toHaveBeenCalledWith({ where: { id: "task-1" }, data: updateData });
    expect(mockJsonAdapter.update).not.toHaveBeenCalled();
    expect(result.completed).toBe(true);
  });

  it("findMany: calls Prisma and returns result; JSON adapter not called", async () => {
    const filter = { completed: false };
    mockPrismaTask.findMany.mockResolvedValue([mockTask]);

    const result = await taskRepository.findMany(filter);

    expect(mockPrismaTask.findMany).toHaveBeenCalledWith({
      where: filter,
      orderBy: { createdAt: "desc" },
    });
    expect(mockJsonAdapter.findMany).not.toHaveBeenCalled();
    expect(result).toEqual([mockTask]);
  });

  it("findManyForCalendar: calls Prisma and returns result; JSON adapter not called", async () => {
    const start = new Date("2025-01-01");
    const end = new Date("2025-01-31");
    const indicators = [{ id: "task-1", createdAt: new Date("2025-01-15"), dueDate: null }];
    mockPrismaTask.findMany.mockResolvedValue(indicators);

    const result = await taskRepository.findManyForCalendar(start, end);

    expect(mockPrismaTask.findMany).toHaveBeenCalled();
    expect(mockJsonAdapter.findManyForCalendar).not.toHaveBeenCalled();
    expect(result).toEqual(indicators);
  });
});

// ---------------------------------------------------------------------------

describe("taskRepository – connectivity error → fallback to JSON adapter", () => {
  it("PrismaClientInitializationError: falls back and returns JSON result", async () => {
    mockPrismaTask.create.mockRejectedValue(new PrismaClientInitializationError("No DB"));
    mockJsonAdapter.create.mockReturnValue(mockTask);

    const result = await taskRepository.create(mockCreateInput);

    expect(mockJsonAdapter.create).toHaveBeenCalledWith(mockCreateInput);
    expect(result).toEqual(mockTask);
  });

  it("P1001 (can't reach server): falls back and returns JSON result", async () => {
    mockPrismaTask.create.mockRejectedValue(
      new PrismaClientKnownRequestError("Can't reach server", "P1001")
    );
    mockJsonAdapter.create.mockReturnValue(mockTask);

    const result = await taskRepository.create(mockCreateInput);

    expect(mockJsonAdapter.create).toHaveBeenCalledWith(mockCreateInput);
    expect(result).toEqual(mockTask);
  });

  it("P1002 (timeout): falls back and returns JSON result", async () => {
    mockPrismaTask.create.mockRejectedValue(
      new PrismaClientKnownRequestError("Timeout", "P1002")
    );
    mockJsonAdapter.create.mockReturnValue(mockTask);

    const result = await taskRepository.create(mockCreateInput);

    expect(mockJsonAdapter.create).toHaveBeenCalledWith(mockCreateInput);
    expect(result).toEqual(mockTask);
  });

  it("P1017 (connection closed): falls back and returns JSON result", async () => {
    mockPrismaTask.create.mockRejectedValue(
      new PrismaClientKnownRequestError("Connection closed", "P1017")
    );
    mockJsonAdapter.create.mockReturnValue(mockTask);

    const result = await taskRepository.create(mockCreateInput);

    expect(mockJsonAdapter.create).toHaveBeenCalledWith(mockCreateInput);
    expect(result).toEqual(mockTask);
  });
});

// ---------------------------------------------------------------------------

describe("taskRepository – non-connectivity error → re-thrown", () => {
  it("generic Error propagates; JSON adapter not called", async () => {
    mockPrismaTask.create.mockRejectedValue(new Error("oops"));

    await expect(taskRepository.create(mockCreateInput)).rejects.toThrow("oops");
    expect(mockJsonAdapter.create).not.toHaveBeenCalled();
  });

  it("P2002 constraint violation propagates; JSON adapter not called", async () => {
    mockPrismaTask.create.mockRejectedValue(
      new PrismaClientKnownRequestError("Unique constraint failed", "P2002")
    );

    await expect(taskRepository.create(mockCreateInput)).rejects.toThrow("Unique constraint failed");
    expect(mockJsonAdapter.create).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------

describe("taskRepository – 30-second cache behaviour", () => {
  it("within 30 s of first failure: Prisma is bypassed entirely on second call", async () => {
    // First call: Prisma fails with a connectivity error
    mockPrismaTask.create.mockRejectedValueOnce(new PrismaClientInitializationError("No DB"));
    mockJsonAdapter.create.mockReturnValue(mockTask);

    await taskRepository.create(mockCreateInput);

    // Advance only 10 s – still inside the 30 s TTL
    vi.advanceTimersByTime(10_000);

    // Clear call records; set up JSON adapter for the second call
    vi.clearAllMocks();
    mockJsonAdapter.create.mockReturnValue(mockTask);

    // Second call should skip Prisma entirely
    await taskRepository.create(mockCreateInput);

    expect(mockPrismaTask.create).not.toHaveBeenCalled();
    expect(mockJsonAdapter.create).toHaveBeenCalled();
  });

  it("after 31 s: Prisma is tried again", async () => {
    // First call: Prisma fails
    mockPrismaTask.create.mockRejectedValueOnce(new PrismaClientInitializationError("No DB"));
    mockJsonAdapter.create.mockReturnValue(mockTask);

    await taskRepository.create(mockCreateInput);

    // Advance past the 30 s TTL
    vi.advanceTimersByTime(31_000);

    // Clear call records
    vi.clearAllMocks();
    mockPrismaTask.create.mockResolvedValue(mockTask);

    // Second call should attempt Prisma again
    await taskRepository.create(mockCreateInput);

    expect(mockPrismaTask.create).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------

describe("taskRepository – delete and update fallback", () => {
  it("delete: falls back to JSON adapter on connectivity error (returns void)", async () => {
    mockPrismaTask.delete.mockRejectedValue(new PrismaClientInitializationError("No DB"));

    await taskRepository.delete("task-1");

    expect(mockJsonAdapter.delete).toHaveBeenCalledWith("task-1");
  });

  it("update: falls back to JSON adapter and returns the modified task", async () => {
    const updateData = { completed: true };
    const updatedTask = { ...mockTask, completed: true };
    mockPrismaTask.update.mockRejectedValue(new PrismaClientInitializationError("No DB"));
    mockJsonAdapter.update.mockReturnValue(updatedTask);

    const result = await taskRepository.update("task-1", updateData);

    expect(mockJsonAdapter.update).toHaveBeenCalledWith("task-1", updateData);
    expect(result.completed).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe("taskRepository – findMany and findManyForCalendar fallback", () => {
  it("findMany: falls back to JSON adapter and returns its result", async () => {
    const filter = { completed: false };
    mockPrismaTask.findMany.mockRejectedValue(new PrismaClientInitializationError("No DB"));
    mockJsonAdapter.findMany.mockReturnValue([mockTask]);

    const result = await taskRepository.findMany(filter);

    expect(mockJsonAdapter.findMany).toHaveBeenCalledWith(filter);
    expect(result).toEqual([mockTask]);
  });

  it("findManyForCalendar: falls back to JSON adapter and returns its result", async () => {
    const start = new Date("2025-01-01");
    const end = new Date("2025-01-31");
    const indicators = [{ id: "task-1", createdAt: new Date("2025-01-15"), dueDate: null }];
    mockPrismaTask.findMany.mockRejectedValue(new PrismaClientInitializationError("No DB"));
    mockJsonAdapter.findManyForCalendar.mockReturnValue(indicators);

    const result = await taskRepository.findManyForCalendar(start, end);

    expect(mockJsonAdapter.findManyForCalendar).toHaveBeenCalledWith(start, end);
    expect(result).toEqual(indicators);
  });
});
