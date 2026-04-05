import { connectDB } from '../../utils/mongodb'
import mongoose from 'mongoose'
import { mkdirSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'

const COLLECTIONS = ['comptes', 'transactions']

function timestamp() {
  const d   = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
       + `_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

export default defineEventHandler(async () => {
  await connectDB()

  const db      = mongoose.connection.db!
  const dirName = timestamp()
  const baseDir = resolve(process.cwd(), 'backups')
  const dir     = join(baseDir, dirName)

  mkdirSync(dir, { recursive: true })

  const meta: Record<string, unknown> = {
    date:        new Date().toISOString(),
    collections: {} as Record<string, number>,
  }

  for (const name of COLLECTIONS) {
    const docs = await db.collection(name).find({}).toArray()
    writeFileSync(join(dir, `${name}.json`), JSON.stringify(docs, null, 2), 'utf-8')
    ;(meta.collections as Record<string, number>)[name] = docs.length
  }

  writeFileSync(join(dir, '_meta.json'), JSON.stringify(meta, null, 2), 'utf-8')

  return { folder: dirName, collections: meta.collections }
})
