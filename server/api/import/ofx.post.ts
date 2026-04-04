import { connectDB } from '../../utils/mongodb'
import { Transaction } from '../../models/Transaction'
import { Account } from '../../models/Account'
import { parseOFX } from '../../utils/ofxParser'

export default defineEventHandler(async (event) => {
  await connectDB()

  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'Aucun fichier reçu' })
  }

  const filePart    = formData.find((f) => f.name === 'file')
  const compteIdPart = formData.find((f) => f.name === 'compteId')

  if (!filePart?.data) {
    throw createError({ statusCode: 400, message: 'Champ "file" manquant' })
  }
  if (!compteIdPart?.data) {
    throw createError({ statusCode: 400, message: 'Champ "compteId" manquant' })
  }

  const compteId = compteIdPart.data.toString('utf-8').trim()

  const compte = await Account.findById(compteId).lean()
  if (!compte) {
    throw createError({ statusCode: 404, message: 'Compte introuvable' })
  }

  const content = filePart.data.toString('latin1')
  const { transactions, dateStart, dateEnd, bankId, acctId } = parseOFX(content)

  if (transactions.length === 0) {
    throw createError({ statusCode: 422, message: 'Aucune transaction trouvée dans le fichier OFX' })
  }

  const ops = transactions.map((t) => ({
    updateOne: {
      filter: { fitId: t.fitId },
      update: {
        $setOnInsert: {
          compteId,
          fitId:        t.fitId,
          date:         t.date,
          type:         t.type,
          beneficiaire: t.beneficiaire,
          montant:      t.montant,
          categories:   [],
          etiquettes:   [],
          memo:         '',
          ...(t.checkNum ? { checkNum: t.checkNum } : {}),
          importedAt:   new Date(),
        },
      },
      upsert: true,
    },
  }))

  const result = await Transaction.bulkWrite(ops)

  return {
    inserted:   result.upsertedCount,
    duplicates: transactions.length - result.upsertedCount,
    total:      transactions.length,
    dateStart,
    dateEnd,
    bankId,
    acctId,
  }
})
