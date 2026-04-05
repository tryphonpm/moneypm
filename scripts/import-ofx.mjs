/**
 * import-ofx.mjs — Import automatique de tous les fichiers OFX d'un dossier
 *
 * Usage :
 *   npm run import-ofx -- <dossier> [--compte <id>] [--recurse]
 *
 * Options :
 *   <dossier>          Chemin du dossier contenant les fichiers .ofx (obligatoire)
 *   --compte <id>      _id MongoDB du compte cible (optionnel si un seul compte existe)
 *   --recurse          Parcourt aussi les sous-dossiers
 *
 * Exemples :
 *   npm run import-ofx -- ./sources_OFX/2026
 *   npm run import-ofx -- ./sources_OFX --recurse --compte 661f3a2b4c5d6e7f8a9b0c1d
 */

import { MongoClient, ObjectId } from 'mongodb'
import { readFileSync, readdirSync, statSync } from 'fs'
import { resolve, join, extname, basename } from 'path'
import { fileURLToPath } from 'url'

// ── .env ──────────────────────────────────────────────────
const __dir = fileURLToPath(new URL('.', import.meta.url))
const root  = resolve(__dir, '..')

function loadEnv() {
  try {
    const raw = readFileSync(join(root, '.env'), 'utf-8')
    for (const line of raw.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq === -1) continue
      const key = t.slice(0, eq).trim()
      const val = t.slice(eq + 1).trim()
      if (!process.env[key]) process.env[key] = val
    }
  } catch { /* pas de .env */ }
}
loadEnv()

// ── Arguments CLI ─────────────────────────────────────────
const args = process.argv.slice(2)

if (args.length === 0 || args[0] === '--help') {
  console.log(`
  Usage : npm run import-ofx -- <dossier> [--compte <id>] [--recurse]

    <dossier>        Dossier contenant les fichiers .ofx
    --compte <id>    _id du compte cible (obligatoire si plusieurs comptes)
    --recurse        Inclure les sous-dossiers
  `)
  process.exit(0)
}

const folderArg   = args.find((a) => !a.startsWith('--') && args.indexOf(a) === 0)
const recurse     = args.includes('--recurse')

// Compte cible fixe : LCL — 07637 025194F
const COMPTE_ID   = '69d12a9b95dfa50791358991'

if (!folderArg) {
  console.error('✖  Dossier manquant.')
  process.exit(1)
}

const folder = resolve(folderArg)

// ── Collecte des fichiers .ofx ────────────────────────────
function collectOfx(dir, recursive) {
  const files = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory() && recursive) {
      files.push(...collectOfx(full, recursive))
    } else if (stat.isFile() && extname(entry).toLowerCase() === '.ofx') {
      files.push(full)
    }
  }
  return files
}

// ── Parser OFX (SGML, charset latin-1) ───────────────────
function extractTag(block, tag) {
  const re = new RegExp(`<${tag}>([^<\n\r]*)`, 'i')
  const m  = block.match(re)
  return m ? m[1].trim() : ''
}

function parseOFXDate(raw) {
  const s = raw.trim().replace(/\[.*\]/, '')
  return new Date(Date.UTC(
    parseInt(s.slice(0, 4)),
    parseInt(s.slice(4, 6)) - 1,
    parseInt(s.slice(6, 8))
  ))
}

function resolveType(trntype, name) {
  const n = name.toUpperCase()
  switch (trntype.toUpperCase()) {
    case 'XFER':
      if (n.startsWith('PRLV') || n.includes('PRELEVEMENT')) return 'Prélèvement'
      if (n.startsWith('VIR')  || n.includes('VIREMENT'))    return 'Virement'
      return 'Transfer'
    case 'DEBIT':
      if (n.startsWith('CB ') || n.startsWith('CB\t'))        return 'Carte'
      if (n.includes('RETRAIT') || n.includes('DAB'))         return 'Retrait DAB'
      if (n.includes('COTISATION') || n.includes('FRAIS') || n.includes('ASSURANCE')) return 'Service Charge'
      return 'Debit'
    case 'CREDIT':
      if (n.startsWith('VIR') || n.includes('VIREMENT'))      return 'Virement'
      return 'Credit'
    case 'CHECK':  return 'Remise chèque(s)'
    case 'ATM':    return 'Retrait DAB'
    case 'SRVCHG': return 'Service Charge'
    default:       return 'Debit'
  }
}

function parseOFX(buffer) {
  const text = buffer.toString('latin1').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const transactions = []
  const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  let match

  while ((match = trnRegex.exec(text)) !== null) {
    const block    = match[1]
    const trnType  = extractTag(block, 'TRNTYPE')
    const dtPosted = extractTag(block, 'DTPOSTED')
    const trnAmt   = extractTag(block, 'TRNAMT')
    const fitId    = extractTag(block, 'FITID')
    const name     = extractTag(block, 'NAME')
    const checkNum = extractTag(block, 'CHECKNUM')
    const memo     = extractTag(block, 'MEMO')

    if (!fitId || !dtPosted || !trnAmt) continue

    const beneficiaire = name || memo || (checkNum ? `Chèque n°${checkNum}` : '')

    transactions.push({
      fitId,
      date:         parseOFXDate(dtPosted),
      type:         resolveType(trnType, beneficiaire),
      beneficiaire,
      montant:      parseFloat(trnAmt.replace(',', '.')),
      ...(checkNum ? { checkNum } : {}),
    })
  }
  return transactions
}

// ── Script principal ──────────────────────────────────────
async function run() {
  const uri    = process.env.MONGODB_URI || 'mongodb://localhost:27017/moneypm'
  const dbName = uri.split('/').pop().split('?')[0] || 'moneypm'

  console.log(`\n📂  MoneyPM — Import OFX automatique`)
  console.log(`   URI     : ${uri}`)
  console.log(`   Dossier : ${folder}`)
  if (recurse) console.log(`   Mode    : récursif`)

  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db(dbName)

  try {
    // ── Résolution du compte ────────────────────────────
    const compte = await db.collection('comptes').findOne({ _id: new ObjectId(COMPTE_ID) })
    if (!compte) {
      console.error(`✖  Compte introuvable : ${COMPTE_ID}`)
      process.exit(1)
    }
    const compteId = compte._id
    console.log(`   Compte  : ${compte.BANQUE} — ${compte.numero_compte}`)

    // ── Collecte des fichiers ───────────────────────────
    let files
    try {
      files = collectOfx(folder, recurse)
    } catch {
      console.error(`✖  Impossible de lire le dossier : ${folder}`)
      process.exit(1)
    }

    if (files.length === 0) {
      console.log('\n⚠  Aucun fichier .ofx trouvé dans ce dossier.\n')
      process.exit(0)
    }

    console.log(`\n   ${files.length} fichier(s) .ofx trouvé(s)\n`)

    // ── Import fichier par fichier ──────────────────────
    let totalInserted  = 0
    let totalDuplicate = 0
    let totalFiles     = 0

    for (const file of files) {
      const name   = basename(file)
      let buffer
      try { buffer = readFileSync(file) }
      catch { console.log(`   ⚠  ${name} — impossible à lire, ignoré`); continue }

      const transactions = parseOFX(buffer)
      if (transactions.length === 0) {
        console.log(`   ⚠  ${name} — 0 transaction parsée, ignoré`)
        continue
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

      const result    = await db.collection('transactions').bulkWrite(ops)
      const inserted  = result.upsertedCount
      const duplicate = transactions.length - inserted

      console.log(`   ✔  ${name.padEnd(60)} ${String(inserted).padStart(3)} nouvelles  ${String(duplicate).padStart(3)} doublons`)
      totalInserted  += inserted
      totalDuplicate += duplicate
      totalFiles++
    }

    console.log(`\n${'─'.repeat(72)}`)
    console.log(`   ${totalFiles} fichier(s) traité(s) — ${totalInserted} écriture(s) importée(s), ${totalDuplicate} doublon(s) ignoré(s)`)
    console.log('')

  } finally {
    await client.close()
  }
}

run().catch((err) => {
  console.error('\n✖  Erreur :', err.message)
  process.exit(1)
})
