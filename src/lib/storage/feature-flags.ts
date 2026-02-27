/**
 * Feature flag for local storage fallback
 *
 * TO REMOVE THIS FEATURE:
 * 1. Delete this file
 * 2. Delete src/lib/storage/local-storage-adapter.ts
 * 3. Delete src/lib/storage/task-repository.ts
 * 4. Delete src/lib/storage/index.ts
 * 5. In src/app/actions.ts, replace `import { taskRepository } from "@/lib/storage"` with `import { prisma } from "@/lib/prisma"`
 * 6. Replace all `taskRepository.*` calls with direct `prisma.task.*` calls
 * 7. Remove ENABLE_LOCAL_STORAGE_FALLBACK from .env and .env.example
 */

export const ENABLE_LOCAL_STORAGE_FALLBACK =
  process.env.ENABLE_LOCAL_STORAGE_FALLBACK === "true";
