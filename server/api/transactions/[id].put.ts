import { connectDB } from '../../utils/mongodb'
import { Transaction } from '../../models/Transaction'

export default defineEventHandler(async (event) => {
  await connectDB()

  const id   = getRouterParam(event, 'id')
  const body = await readBody(event)

  const allowed = ['type', 'beneficiaire', 'categories', 'etiquettes', 'memo', 'date']
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  const doc = await Transaction.findByIdAndUpdate(id, update, { new: true, lean: true })
  if (!doc) throw createError({ statusCode: 404, message: 'Transaction introuvable' })

  return doc
})
