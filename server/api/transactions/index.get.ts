import { connectDB } from '../../utils/mongodb'
import { Transaction } from '../../models/Transaction'

export default defineEventHandler(async (event) => {
  await connectDB()

  const query = getQuery(event)

  if (!query.compteId) {
    throw createError({ statusCode: 400, message: 'compteId est obligatoire' })
  }

  const page  = Math.max(1, parseInt(String(query.page  || 1)))
  const limit = Math.min(500, Math.max(1, parseInt(String(query.limit || 200))))
  const skip  = (page - 1) * limit

  const filter: Record<string, unknown> = { compteId: query.compteId }

  if (query.dateFrom || query.dateTo) {
    filter.date = {}
    if (query.dateFrom) (filter.date as Record<string, unknown>).$gte = new Date(String(query.dateFrom))
    if (query.dateTo)   (filter.date as Record<string, unknown>).$lte = new Date(String(query.dateTo))
  }
  if (query.type) filter.type = query.type

  const [transactions, total] = await Promise.all([
    Transaction.find(filter).sort({ date: -1 }).skip(skip).limit(limit).lean(),
    Transaction.countDocuments(filter),
  ])

  return { transactions, total, page, limit }
})
