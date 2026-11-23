import { mkdirSync } from "node:fs"
import { resolve } from "node:path"
import { MongoMemoryServer } from "mongodb-memory-server"

// DEV ONLY: runs a local MongoDB on 127.0.0.1:27017 without installing MongoDB.
// Data is kept in .local-db/ between restarts. Keep this terminal open while the API runs.
// (Downloads the MongoDB binary once, on the first run.)
const LOCAL_DB_PORT = 27017
const LOCAL_DB_PATH = resolve(".local-db")

const startLocalDb = async (): Promise<void> => {
  mkdirSync(LOCAL_DB_PATH, { recursive: true })
  const server = await MongoMemoryServer.create({
    instance: { port: LOCAL_DB_PORT, dbPath: LOCAL_DB_PATH, storageEngine: "wiredTiger" },
  })
  console.log(`Local MongoDB running at ${server.getUri()} (data in ${LOCAL_DB_PATH}). Press Ctrl+C to stop.`)

  const stopLocalDb = async (): Promise<void> => {
    await server.stop({ doCleanup: false })
    process.exit(0)
  }
  process.on("SIGINT", stopLocalDb)
  process.on("SIGTERM", stopLocalDb)
}

startLocalDb().catch((error: unknown) => {
  console.error("Could not start the local MongoDB:", error)
  process.exit(1)
})
