import type { TransactionType } from '../models/Transaction'

export interface OFXTransaction {
  fitId: string
  date: Date
  type: TransactionType
  beneficiaire: string
  montant: number
  checkNum?: string
}

export interface OFXParseResult {
  transactions: OFXTransaction[]
  dateStart?: Date
  dateEnd?: Date
  bankId?: string
  acctId?: string
  currency?: string
}

/** Convertit une date OFX (YYYYMMDD ou YYYYMMDDHHmmss) en Date JS */
function parseOFXDate(raw: string): Date {
  const s = raw.trim().replace(/\[.*\]/, '')
  const y = parseInt(s.slice(0, 4))
  const m = parseInt(s.slice(4, 6)) - 1
  const d = parseInt(s.slice(6, 8))
  return new Date(Date.UTC(y, m, d))
}

/** Détermine le type applicatif depuis TRNTYPE OFX + libellé */
function resolveType(trntype: string, name: string): TransactionType {
  const n = name.toUpperCase()

  switch (trntype.toUpperCase()) {
    case 'XFER':
      if (n.startsWith('PRLV') || n.includes('PRELEVEMENT')) return 'Prélèvement'
      if (n.startsWith('VIR') || n.includes('VIREMENT'))     return 'Virement'
      return 'Transfer'

    case 'DEBIT':
      if (n.startsWith('CB ') || n.startsWith('CB\t'))       return 'Carte'
      if (n.includes('RETRAIT') || n.includes('DAB'))        return 'Retrait DAB'
      if (n.includes('COTISATION') || n.includes('FRAIS') || n.includes('ASSURANCE')) return 'Service Charge'
      return 'Debit'

    case 'CREDIT':
      if (n.startsWith('VIR') || n.includes('VIREMENT'))     return 'Virement'
      if (n.includes('REMISE'))                               return 'Remise chèque(s)'
      return 'Credit'

    case 'CHECK':
      return 'Remise chèque(s)'

    case 'ATM':
      return 'Retrait DAB'

    case 'SRVCHG':
      return 'Service Charge'

    default:
      return 'Debit'
  }
}

/** Extrait la valeur d'un tag SGML : <TAG>value */
function extractTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}>([^<\n\r]*)`, 'i')
  const m = block.match(re)
  return m ? m[1].trim() : ''
}

/**
 * Parse un fichier OFX (SGML, format bancaire français).
 * Accepte le contenu brut en string (UTF-8 ou latin-1 converti).
 */
export function parseOFX(content: string): OFXParseResult {
  // Normaliser les fins de ligne
  const text = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  const result: OFXParseResult = { transactions: [] }

  // Infos compte
  const bankId  = extractTag(text, 'BANKID')
  const acctId  = extractTag(text, 'ACCTID')
  const curDef  = extractTag(text, 'CURDEF')
  const dtStart = extractTag(text, 'DTSTART')
  const dtEnd   = extractTag(text, 'DTEND')

  if (bankId)  result.bankId   = bankId
  if (acctId)  result.acctId   = acctId
  if (curDef)  result.currency = curDef
  if (dtStart) result.dateStart = parseOFXDate(dtStart)
  if (dtEnd)   result.dateEnd   = parseOFXDate(dtEnd)

  // Extraction des blocs <STMTTRN>...</STMTTRN>
  const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  let match: RegExpExecArray | null

  while ((match = trnRegex.exec(text)) !== null) {
    const block = match[1]

    const trnType  = extractTag(block, 'TRNTYPE')
    const dtPosted = extractTag(block, 'DTPOSTED')
    const trnAmt   = extractTag(block, 'TRNAMT')
    const fitId    = extractTag(block, 'FITID')
    const name     = extractTag(block, 'NAME')
    const checkNum = extractTag(block, 'CHECKNUM')
    const memo     = extractTag(block, 'MEMO')

    if (!fitId || !dtPosted || !trnAmt) continue

    const montant = parseFloat(trnAmt.replace(',', '.'))
    const beneficiaire = name || memo || (checkNum ? `Chèque n°${checkNum}` : '')

    result.transactions.push({
      fitId,
      date:  parseOFXDate(dtPosted),
      type:  resolveType(trnType, beneficiaire),
      beneficiaire,
      montant,
      ...(checkNum ? { checkNum } : {}),
    })
  }

  return result
}
