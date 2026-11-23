import mongoose from "mongoose"

// Transactions need a replica set (Atlas always is one); a standalone local MongoDB isn't.
let isTransactionSupported = false

export const connectDatabase = async (mongoUri: string): Promise<void> => {
  await mongoose.connect(mongoUri)
  const helloResponse = await mongoose.connection.db?.admin().command({ hello: 1 })
  isTransactionSupported = Boolean(helloResponse?.setName)
}

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect()
}

// Runs the writes in one transaction when the database supports it, otherwise one after another.
export const runInTransaction = async <Result>(
  writeChanges: (session: mongoose.ClientSession | undefined) => Promise<Result>
): Promise<Result> => {
  if (!isTransactionSupported) {
    return writeChanges(undefined)
  }
  const session = await mongoose.startSession()
  try {
    return await session.withTransaction(() => writeChanges(session))
  } finally {
    await session.endSession()
  }
}
