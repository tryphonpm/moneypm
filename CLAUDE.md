# CLAUDE.md — MoneyPM

Application de gestion d'écritures bancaires. Usage personnel, import mensuel de fichiers OFX.

## Stack technique

| Couche | Choix |
|--------|-------|
| Framework | **Nuxt 4** (Nitro server intégré) |
| Langage | **TypeScript** strict |
| UI | **Vue 3** Composition API (`<script setup>`) |
| Style | **TailwindCSS** via `@nuxtjs/tailwindcss` |
| Base de données | **MongoDB** via **Mongoose** (exclusif) |
| Env | Variables dans `.env` — `MONGODB_URI`, `NODE_ENV` |

## Structure du projet

```
app/
  app.vue                          → NuxtLayout + NuxtPage
  assets/css/main.css              → CSS global + @layer components (classes utilitaires)
  layouts/default.vue              → Header applicatif + <slot>
  pages/index.vue                  → Page principale (écritures)
  types/transaction.ts             → Types TypeScript partagés côté client
  components/
    ui/
      AppModal.vue                 → Modal générique avec Teleport
      AppBadge.vue                 → Badge coloré (prop color)
      AppTagInput.vue              → Saisie de tags (Entrée / virgule / Backspace)
    transactions/
      TransactionTable.vue         → Tableau tri + sélection + export CSV
      TransactionEditModal.vue     → Formulaire d'édition en modale
      ImportOFX.vue                → Drag-drop import fichier .ofx

server/
  models/Transaction.ts            → Schema Mongoose (index fitId unique, date)
  utils/mongodb.ts                 → connectDB() — singleton Mongoose
  utils/ofxParser.ts               → parseOFX(content) → OFXParseResult
  api/
    transactions/
      index.get.ts                 → GET  /api/transactions  (filtres: type, dateFrom, dateTo)
      [id].put.ts                  → PUT  /api/transactions/:id
    import/
      ofx.post.ts                  → POST /api/import/ofx  (multipart, upsert anti-doublon)

tailwind.config.ts                 → Thème étendu (couleurs primary, credit, debit, fonts)
```

## Modèle Transaction (MongoDB)

```ts
{
  fitId:        string   // identifiant unique OFX — clé de déduplication
  date:         Date
  type:         TransactionType
  beneficiaire: string
  montant:      number   // négatif = retrait, positif = dépôt
  categories:   string[]
  etiquettes:   string[]
  memo:         string
  checkNum?:    string
  importedAt:   Date
}
```

## Types de transaction

`ATM` · `Carte` · `Check` · `Credit` · `Debit` · `Prélèvement` · `Remise chèque(s)` · `Retrait DAB` · `Service Charge` · `Transfer` · `Virement`

## Mapping OFX → type applicatif

| TRNTYPE OFX | Condition sur NAME | Type résultant |
|-------------|-------------------|----------------|
| XFER | commence par `PRLV` | Prélèvement |
| XFER | commence par `VIR` | Virement |
| XFER | autre | Transfer |
| DEBIT | commence par `CB ` | Carte |
| DEBIT | contient `RETRAIT`/`DAB` | Retrait DAB |
| DEBIT | contient `COTISATION`/`FRAIS`/`ASSURANCE` | Service Charge |
| DEBIT | autre | Debit |
| CREDIT | commence par `VIR` | Virement |
| CREDIT | autre | Credit |
| CHECK | — | Remise chèque(s) |
| ATM | — | Retrait DAB |

## Règles de développement

### Composants
- Tous les composants UI réutilisables vont dans `app/components/ui/`.
- Utiliser exclusivement les classes CSS définies dans `main.css` (`@layer components`) : `btn`, `btn-primary`, `form-input`, `form-label`, `badge`, `card`, `modal-*`, `amount-credit`, `amount-debit`, etc.
- Ne pas écrire de styles inline ou de classes Tailwind ad hoc dans les pages/composants si une classe utilitaire équivalente existe déjà dans `main.css`.

### Serveur / API
- Toujours appeler `await connectDB()` en début de chaque handler Nitro.
- Les routes API suivent la convention fichier Nuxt (`index.get.ts`, `[id].put.ts`, etc.).
- L'import OFX fait un **upsert** sur `fitId` — ne jamais insérer sans cette protection anti-doublon.
- Les fichiers OFX français sont encodés en **Windows-1252** — lire avec `buffer.toString('latin1')`.

### TypeScript
- Types côté client dans `app/types/transaction.ts`.
- Types côté serveur dans les fichiers `server/models/` et `server/utils/`.
- Ne pas dupliquer les types entre client et serveur — utiliser des imports croisés si nécessaire.

### Base de données
- MongoDB est la **seule** source de données. Pas de fichier JSON local, pas de localStorage comme persistence.
- Pas de suppression physique pour l'instant — les opérations sont insert/update uniquement.

## Commandes utiles

```bash
npm run dev      # Démarrage en développement (port 3000)
npm run build    # Build production
npm run preview  # Prévisualisation du build
```

MongoDB doit être actif sur `localhost:27017` (base : `money`, configurable via `MONGODB_URI` dans `.env`).

## Exemple de fichier OFX

Les fichiers source sont dans `sources_OFX/YYYY/`. Format SGML (pas XML), header propriétaire,
transactions dans des blocs `<STMTTRN>...</STMTTRN>`.
