import mongoose, { Schema, type Document } from 'mongoose'

export interface IAccount extends Document {
  BANQUE: string
  numero_compte: string
}

const AccountSchema = new Schema<IAccount>(
  {
    BANQUE:        { type: String, required: true },
    numero_compte: { type: String, required: true },
  },
  { timestamps: false, versionKey: false }
)

export const Account =
  mongoose.models.Account ||
  mongoose.model<IAccount>('Account', AccountSchema, 'comptes')
