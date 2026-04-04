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

export interface Transaction {
  _id: string
  compteId: string
  fitId: string
  date: string
  type: TransactionType
  beneficiaire: string
  montant: number
  categories: string[]
  etiquettes: string[]
  memo: string
  checkNum?: string
  importedAt: string
}
