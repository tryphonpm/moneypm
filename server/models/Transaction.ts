import mongoose, { Schema, type Document } from 'mongoose'

export type TransactionType =
  | 'ATM'
  | 'Carte'
  | 'Check'
  | 'Credit'
  | 'Debit'
  | 'Prélèvement'
  | 'Remise chèque(s)'
  | 'Retrait DAB'
  | 'Service Charge'
  | 'Transfer'
  | 'Virement'

export interface ITransaction extends Document {
  fitId: string
  date: Date
  type: TransactionType
  beneficiaire: string
  montant: number          // négatif = retrait, positif = dépôt
  categories: string[]
  etiquettes: string[]
  memo: string
  checkNum?: string
  importedAt: Date
}

const TransactionSchema = new Schema<ITransaction>(
  {
    fitId:       { type: String, required: true, unique: true },
    date:        { type: Date, required: true },
    type:        { type: String, required: true },
    beneficiaire:{ type: String, default: '' },
    montant:     { type: Number, required: true },
    categories:  { type: [String], default: [] },
    etiquettes:  { type: [String], default: [] },
    memo:        { type: String, default: '' },
    checkNum:    { type: String },
    importedAt:  { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    versionKey: false,
  }
)

// Index pour les requêtes fréquentes
TransactionSchema.index({ date: -1 })

export const Transaction =
  mongoose.models.Transaction ||
  mongoose.model<ITransaction>('Transaction', TransactionSchema)
