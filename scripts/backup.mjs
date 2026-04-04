/**
 * backup.mjs — Sauvegarde locale des collections MongoDB de MoneyPM
 *
 * Usage :
 *   npm run backup
 *   npm run backup -- --out ./mes-backups   (dossier personnalisé)
 *
 * Produit un sous-dossier horodaté dans ./backups/ (ou --out) :
 *   backups/
 *     2026-04-04_153012/
 *       comptes.json
 *       transactions.json
 *       _meta.json          (heure, URI, stats)
 */

import { MongoClient } from 'mongodb'
import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'
import { fileURLToPath } from 'url'

// ── Résolution du .env ────────────────────────────────────
const __dir = fileURLToPath(new URL('.', import.meta.url))
const root  = resolve(__dir, '..')

function loadEnv() {
  try {
    const raw = readFileSync(join(root, '.env'), 'utf-8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed.slice(eq + 1).trim()
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    // pas de .env, on continue avec les variables d'environnement existantes
  }
}

loadEnv()

// ── Arguments CLI ─────────────────────────────────────────
const args    = process.argv.slice(2)
const outIdx  = args.indexOf('--out')
const baseDir = outIdx !== -1 && args[outIdx + 1]
  ? resolve(args[outIdx + 1])
  : join(root, 'backups')

// ── Collections à sauvegarder ─────────────────────────────
const COLLECTIONS = ['comptes', 'transactions']

// ── Horodatage ────────────────────────────────────────────
function timestamp() {
  const d   = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
       + `_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

// ── Script principal ──────────────────────────────────────
async function backup() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/moneypm'

  // Extraire le nom de la base depuis l'URI
  const dbName = uri.split('/').pop().split('?')[0] || 'moneypm'

  console.log(`\n🗄  MoneyPM — Sauvegarde MongoDB`)
  console.log(`   URI  : ${uri}`)
  console.log(`   Base : ${dbName}`)

  const client = new MongoClient(uri)

  try {
    await client.connect()
    const db = client.db(dbName)

    const dir = join(baseDir, timestamp())
    mkdirSync(dir, { recursive: true })

    const meta = {
      date:        new Date().toISOString(),
      uri,
      database:    dbName,
      collections: {},
    }

    for (const name of COLLECTIONS) {
      process.stdout.write(`   ↓  ${name} … `)
      const docs  = await db.collection(name).find({}).toArray()
      const file  = join(dir, `${name}.json`)
      writeFileSync(file, JSON.stringify(docs, null, 2), 'utf-8')
      meta.collections[name] = docs.length
      console.log(`${docs.length} document(s)  →  ${file}`)
    }

    writeFileSync(join(dir, '_meta.json'), JSON.stringify(meta, null, 2), 'utf-8')
    console.log(`\n✔  Sauvegarde terminée : ${dir}\n`)

  } finally {
    await client.close()
  }
}

backup().catch((err) => {
  console.error('\n✖  Erreur :', err.message)
  process.exit(1)
})
