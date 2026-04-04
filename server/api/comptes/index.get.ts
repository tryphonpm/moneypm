import { connectDB } from '../../utils/mongodb'
import { Account } from '../../models/Account'

export default defineEventHandler(async () => {
  await connectDB()
  return Account.find().sort({ BANQUE: 1, numero_compte: 1 }).lean()
})
