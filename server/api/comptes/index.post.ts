import { connectDB } from '../../utils/mongodb'
import { Account } from '../../models/Account'

export default defineEventHandler(async (event) => {
  await connectDB()
  const { BANQUE, numero_compte } = await readBody(event)

  if (!BANQUE?.trim() || !numero_compte?.trim()) {
    throw createError({ statusCode: 400, message: 'BANQUE et numero_compte sont obligatoires' })
  }

  const compte = await Account.create({ BANQUE: BANQUE.trim(), numero_compte: numero_compte.trim() })
  return compte
})
