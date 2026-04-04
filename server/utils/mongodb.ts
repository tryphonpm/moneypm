import mongoose from 'mongoose'

let isConnected = false

export async function connectDB() {
  if (isConnected) return

  const config = useRuntimeConfig()
  const uri = config.mongodbUri

  try {
    await mongoose.connect(uri)
    isConnected = true
    console.log('[MongoDB] Connected to', uri)
  } catch (err) {
    console.error('[MongoDB] Connection error:', err)
    throw err
  }
}
