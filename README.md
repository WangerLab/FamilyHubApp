# FamilyHub

Family Household Management PWA für Tim & Iris Wanger — Einkaufslisten, To-Dos, wöchentliche Pflichten, Ausgaben-Tracker und mehr, mit AI-basiertem Brain Dump via Anthropic Claude.

## Live
- **App:** https://family-hub-app-nt3m.vercel.app
- **Deployment:** Vercel (auto-deploy von `main`)

## Stack
- **Frontend:** React 19 + Tailwind CSS + shadcn/ui, Create React App
- **Backend / Realtime / Auth:** Supabase (Postgres)
- **AI:** Anthropic Claude (Sonnet für Brain Dump, Haiku für Kategorie-Vorschläge)
- **Serverless Functions:** Vercel Functions in `frontend/api/`

## Struktur
```
frontend/      React-App, Vercel deployed von hier
  src/         Components, Contexts, Constants
  api/         Vercel Serverless Functions
memory/        Projekt-Dokumentation (PRD.md)
supabase_*.sql SQL-Setup-Files für Supabase-Schema-Historie
```

## Für Claude Code / Claude Chat Sessions
- **Start jeder Session:** `CLAUDE.md` und `PROJEKT_KONTEXT.md` im Root lesen
- **Guardrails:** Max 50 Zeilen pro Commit, one fix = one commit, `git diff` vor dem Commit zeigen
- **Deployment-Regeln:** Root Directory für Vercel ist `frontend/`, `vercel.json` IMMER in `frontend/vercel.json`, nie im Repo-Root

## User
| | Tim | Iris |
|---|---|---|
| Gerät | Android Pixel 10 XL | iPhone 16 |
| Farbe | #EC4899 Pink | #2563EB Blau |
