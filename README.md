# Stockurial — Artcurial Stock Management

Application de gestion de stock pour Artcurial.

## Stack
- **Next.js 14** (App Router)
- **Supabase** (Postgres + Storage)
- **Anthropic Claude** (OCR + description IA)
- **Vercel** (hébergement)

## Installation locale

```bash
npm install
npm run dev
```

## Déploiement Vercel

### 1. Schéma Supabase
Dans Supabase → SQL Editor → New query, coller le contenu de `supabase/schema.sql` et exécuter.

### 2. Push sur GitHub
```bash
git init
git add .
git commit -m "init stockurial"
git remote add origin https://github.com/TON_COMPTE/stockurial.git
git push -u origin main
```

### 3. Déployer sur Vercel
- vercel.com → New Project → importer le repo GitHub
- Ajouter les variables d'environnement :
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `ANTHROPIC_API_KEY`

### 4. Variables d'environnement (copier depuis .env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://djmmpwtwjxieatkucmsx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
```

## Structure

```
app/
  page.tsx          → Stock actif (liste + création)
  recherche/        → Recherche multi-critères + photo
  archives/         → Lots sortis + historique
  api/claude/       → Proxy OCR + IA
  api/export/       → Export Excel
components/
  FicheForm.tsx     → Formulaire création/édition
  FicheCard.tsx     → Carte lot
  PhotoZone.tsx     → Capture photo (caméra ou photothèque)
  StatusBadge.tsx   → Badge statut
lib/
  supabase.ts       → Client + helpers
  types.ts          → Types TypeScript
  export.ts         → PDF + Excel client-side
supabase/
  schema.sql        → Schéma base de données
```

## Statuts
- ⚠️ Incomplet — fiche ouverte, infos manquantes
- 📥 Réceptionné — bon de dépôt fait
- 📸 Photographié — photos prises
- 📦 Rangé — en rack, fiche complète
- 🚚 Sorti — archivé automatiquement

## Export
- **PDF** : une fiche par page, toutes les photos incluses
- **Excel** : toutes les fiches en tableau
- Sélection multiple possible via les checkboxes
