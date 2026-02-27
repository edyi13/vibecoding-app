/**
 * Storage module entry point
 *
 * TO REMOVE THIS FEATURE: Delete this entire storage folder (see feature-flags.ts for full instructions)
 */

export { taskRepository } from "./task-repository";
export { ENABLE_LOCAL_STORAGE_FALLBACK } from "./feature-flags";
export type {
  StorageTask,
  StorageTaskIndicator,
  StoragePriority,
  CreateTaskData,
  UpdateTaskData,
  TaskWhereInput,
  CalendarWhereInput,
  ITaskStorage,
} from "./types";
