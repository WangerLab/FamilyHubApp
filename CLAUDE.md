# FamilyHub — CLAUDE.md
# Orchestration Harness für Claude Code
# Lies diese Datei zu Beginn JEDER Session. Keine Ausnahmen.

---

## 🏠 Projekt-Übersicht

Family Household Management PWA für Tim & Iris Wanger.
- **Live URL:** https://family-hub-app-nt3m.vercel.app
- **GitHub:** https://github.com/WangerLab/FamilyHubApp
- **Stack:** React 19 + Tailwind + shadcn/ui + Supabase + Vercel

---

## ⚠️ KRITISCHE DEPLOYMENT-REGELN — IMMER ZUERST LESEN

```
1. Root Directory in Vercel = `frontend/`
   → Alle Pfade gelten relativ zu frontend/
   → vercel.json IMMER in frontend/vercel.json — NIE im Repo-Root
   → Build Commands NIE mit "cd frontend &&" prefixen

2. Vercel Serverless Functions liegen in frontend/api/
   → Beispiel: frontend/api/brain-dump/parse.js

3. Output Directory = `build` (nicht frontend/build)

4. Environment Variables:
   → REACT_APP_SUPABASE_URL        (Frontend — mit Prefix)
   → REACT_APP_SUPABASE_ANON_KEY   (Frontend — mit Prefix)
   → ANTHROPIC_API_KEY             (Server-seitig — KEIN REACT_APP_ Prefix)
```

---

## 📐 Architektur

```
frontend/
  src/
    components/
      AppShell.jsx        ← Layout-Root: TopBar + <main> + BottomNav
      TopBar.jsx          ← Höhe: 64px + safe-area-inset-top
      BottomNav.jsx       ← Höhe: 80px + safe-area-inset-bottom
      tabs/
        ShoppingTab.jsx   ← Sticky Header (~169px) + Kategorie-Liste
        HomeTab.jsx
        TasksTab.jsx
        ChoresTab.jsx
        MoreTab.jsx
        ExpensesTab.jsx
      grocery/
        GroceryItemRow.jsx
        BrainDump.jsx     ← AI Parser — ruft /api/brain-dump/parse auf
        AddItemInput.jsx
      misc/
        SonstigesList.jsx
    contexts/             ← GroceryContext, MiscContext, TodosContext, etc.
    constants/            ← categories.js, miscLocations.js
  api/
    brain-dump/
      parse.js            ← Vercel Serverless Function (Anthropic API)
  vercel.json             ← Nur rewrites, kein buildCommand
  package.json
```

**AppShell <main> Layout:**
```
paddingTop: calc(64px + env(safe-area-inset-top))   ← für TopBar
paddingBottom: calc(80px + env(safe-area-inset-bottom))  ← für BottomNav
paddingLeft/Right: 1rem
overflow-y: auto
```

---

## 🔒 GUARDRAILS — Pflichtregeln für jeden Fix

### Vor dem Coden
- [ ] CLAUDE.md gelesen
- [ ] PROJEKT_KONTEXT.md gelesen
- [ ] Betroffene Dateien mit `view` geöffnet und verstanden
- [ ] Fix-Plan in max. 3 Sätzen formuliert

### Beim Coden
- [ ] Max. 50 Zeilen geändert pro Commit
- [ ] One fix = One commit (keine Sammelpushes)
- [ ] Keine Änderungen an Dateien die nicht direkt zum Fix gehören
- [ ] Keine neuen Dependencies ohne explizite Erlaubnis

### Nach dem Coden
- [ ] Geänderte Dateien nochmal lesen und prüfen
- [ ] `git diff --stat` zeigen bevor commit
- [ ] Commit Message: "fix: [was genau gefixt wurde]"
- [ ] NIE "done" sagen ohne Verifikation gezeigt zu haben

---

## 🐛 Bekannte Bugs & Fallstricke

### OFFEN: Erstes Item in Einkaufsliste überdeckt
**Problem:** ShoppingTab hat sticky Header (~169px). Items darunter starten direkt nach
`paddingTop` von `<main>` — der sticky Header überdeckt sie physisch.

**Bereits versucht (alles gescheitert):**
- ResizeObserver für headerHeight → misst falsch wenn BrainDump ausgeklappt (691px)
- scrollMarginTop → nur für programmatisches Scrollen
- isolation:isolate + z-index → keine Wirkung
- CSS Custom Property --shopping-header-h → selbes Problem
- paddingTop auf Items-Container → Items verschwinden
- Sticky von Kategorie-Headern entfernen → keine Wirkung

**Hinweis für nächsten Fix-Versuch:**
Der `<main>` Container in AppShell.jsx muss je nach aktivem Tab unterschiedliches
paddingTop bekommen — oder ShoppingTab muss seinen sticky Header anders positionieren
sodass er ÜBER dem <main> paddingTop sitzt, nicht innerhalb.

### RESOLVED: Brain Dump 404
War: FastAPI Backend auf Netlify nicht lauffähig.
Fix: Vercel Serverless Function in `frontend/api/brain-dump/parse.js`

### RESOLVED: vercel.json im falschen Ordner
War: vercel.json im Repo-Root → wird von Vercel ignoriert (Root Dir = frontend)
Fix: Immer in `frontend/vercel.json`

---

## 📋 Modul-Status

| Modul | Status |
|-------|--------|
| Auth + PWA Shell + Navigation | ✅ Fertig |
| Einkaufsliste Nahrungsmittel | ✅ Fertig (Bug: erstes Item) |
| AI Brain Dump (alle Module) | ✅ Fertig |
| Einkaufsliste Sonstiges | ✅ Fertig |
| To-Dos + Wöchentliche Pflichten | ✅ Fertig |
| Dashboard + Notification Center | ✅ Fertig |
| Ausgaben-Tracker | ✅ Fertig |
| Pinboard + Geburtstage | ❌ Noch nicht gebaut |
| Google Calendar Integration | ❌ Noch nicht gebaut |

---

## 👥 User Setup

| | Tim | Iris |
|---|---|---|
| Gerät | Android Pixel 10 XL | iPhone 16 |
| Browser | Chrome (PWA nativ) | Safari (manuell installieren) |
| Farbe | #3B82F6 Blau | #F43F5E Rose |
| Push Notifications | Funktioniert | Nur nach PWA Installation |

---

## 🔄 Workflow

```
Tim (Chat mit Claude) → analysiert Problem, schreibt Command
    ↓
Claude Code → liest CLAUDE.md, führt Command aus, committet
    ↓
GitHub main → Vercel deployed automatisch
    ↓
Tim testet auf Mobile → gibt Feedback im Chat
```

---

## 📦 Supabase Tabellen

- `households`, `household_members`
- `grocery_items` — Einkaufsliste Nahrungsmittel
- `misc_items` — Einkaufsliste Sonstiges
- `todos` — To-Dos mit Priorität, Deadline, Assignee, Nudge
- `chores`, `chore_completions` — Wöchentliche Pflichten
- `activity_log` — Notification Center
- `expenses`, `monthly_balance_archive` — Ausgaben-Tracker

---

*FamilyHub — CLAUDE.md — Tim Wanger — April 2026*
