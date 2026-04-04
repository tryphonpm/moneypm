import { connectDB } from '../../utils/mongodb'
import { Transaction } from '../../models/Transaction'
import { parseOFX } from '../../utils/ofxParser'

export default defineEventHandler(async (event) => {
  await connectDB()

  // Lecture du body multipart
  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'Aucun fichier reçu' })
  }

  const file = formData.find((f) => f.name === 'file')
  if (!file || !file.data) {
    throw createError({ statusCode: 400, message: 'Champ "file" manquant' })
  }

  // Décodage — les fichiers OFX français sont souvent en Windows-1252
  // Node Buffer.toString('latin1') couvre le charset 1252 de base
  const content = file.data.toString('latin1')

  const { transactions, dateStart, dateEnd, bankId, acctId } = parseOFX(content)

  if (transactions.length === 0) {
    throw createError({ statusCode: 422, message: 'Aucune transaction trouvée dans le fichier OFX' })
  }

  // Insertion avec upsert sur fitId pour éviter les doublons
  const ops = transactions.map((t) => ({
    updateOne: {
      filter: { fitId: t.fitId },
      update: {
        $setOnInsert: {
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
