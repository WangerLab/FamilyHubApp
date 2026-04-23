# FamilyHub — Projekt Kontext für Claude

## Vercel Deployment
- **Live URL:** https://family-hub-app-nt3m.vercel.app
- **Root Directory:** `frontend` — Vercel arbeitet IMMER im `frontend/` Ordner
- **Framework:** Create React App
- **Build Command:** `yarn build` (Override in Vercel Dashboard)
- **Output Directory:** `build` (relativ zu `frontend/`, also `frontend/build`)
- **Install Command:** `yarn install --legacy-peer-deps`
- **vercel.json:** liegt in `frontend/vercel.json` — NICHT im Repo-Root
- **Vercel Functions:** liegen in `frontend/api/` — z.B. `frontend/api/brain-dump/parse.js`

## KRITISCHE REGELN für alle Fixes
1. `vercel.json` immer in `frontend/vercel.json` — nie im Repo-Root
2. Build Commands nie mit `cd frontend &&` prefixen — Vercel ist bereits in `frontend/`
3. Output Directory in vercel.json ist `build`, nicht `frontend/build`
4. Vercel Serverless Functions liegen in `frontend/api/`
5. Vor jedem Fix diese Datei lesen!

## Environment Variables
- `REACT_APP_SUPABASE_URL` — Supabase Projekt-URL (im Frontend verwendet)
- `REACT_APP_SUPABASE_ANON_KEY` — Supabase Public Key (im Frontend verwendet)
- `ANTHROPIC_API_KEY` — Anthropic API Key (nur server-seitig in Vercel Functions, KEIN REACT_APP_ Prefix)

## GitHub
- Repo: https://github.com/WangerLab/FamilyHubApp
- Aktiver Branch: main
- Struktur: `frontend/` (React PWA), `backend/` (alt, läuft nicht mehr), `memory/`

## Tech Stack
- Frontend: React 19, Tailwind CSS, shadcn/ui, CRACO
- Auth + DB + Realtime: Supabase
- AI Parsing: Anthropic Claude Sonnet (Vercel Function in `frontend/api/`)
- Deployment: Vercel (auto-deploy von main)

## Bekannte Fallstricke
- `vercel.json` im Repo-Root wird von Vercel ignoriert (Root Directory ist `frontend`)
- `cd frontend &&` im Build Command schlägt fehl — Vercel ist bereits in `frontend/`
- Supabase Realtime kann auf iOS nach App-Backgrounding einfrieren → Reconnect-Logik nötig
- Brain Dump API Key muss `ANTHROPIC_API_KEY` heißen, nicht `REACT_APP_ANTHROPIC_API_KEY`
