import { MongoMemoryReplSet } from "mongodb-memory-server"
import type { TestProject } from "vitest/node"

declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string
  }
}

const MONGO_LAUNCH_TIMEOUT_MS = 60_000

// One in-memory replica set (like Atlas, so transactions run) for the whole test run.
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const replicaSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    instanceOpts: [{ launchTimeout: MONGO_LAUNCH_TIMEOUT_MS }],
  })
  project.provide("mongoUri", replicaSet.getUri())
  return async () => {
    await replicaSet.stop()
  }
}
