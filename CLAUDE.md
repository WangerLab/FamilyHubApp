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

### RESOLVED: Brain Dump 404
War: FastAPI Backend auf Netlify nicht lauffähig.
Fix: Vercel Serverless Function in `frontend/api/brain-dump/parse.js`

### RESOLVED: vercel.json im falschen Ordner
War: vercel.json im Repo-Root → wird von Vercel ignoriert (Root Dir = frontend)
Fix: Immer in `frontend/vercel.json`

### RESOLVED: Erstes Item in Einkaufsliste überdeckt (April 2026)

War: Sechs Fix-Versuche (ResizeObserver, scrollMarginTop, isolation, CSS-Custom-Properties,
paddingTop-Tricks) alle erfolglos weil sie am falschen Ende ansetzten.

Ursache: Redundanter 64px-Offset. `<main>` hat `padding-top: calc(64px + env(safe-area-inset-top))`
für die TopBar, UND der Shopping-Header hatte `sticky top: calc(64px + env(safe-area-inset-top))`.
Sticky hat den Header dann 64px AUS seiner Natural-Flow-Position nach unten verschoben — in diese
64-Pixel-Lücke fielen die Items.

Fix (Commit 4763cd4): `sticky top: 0` am Shopping-Header, `catStickyTop: '170px'` — beide relativ
zum bereits durch `<main>` padding offset Scroll-Port-Start.

Lehre: Sticky-Elemente in einem Scroll-Container mit padding dürfen den padding-Wert NICHT
nochmal als top-Offset addieren. Das padding reserviert bereits Platz; sticky-top:0 klebt am
Content-Box-Rand.

### RESOLVED: Items-Hinzufügen schlägt still fehl (April 2026)

War: Plus-Button-Klick löste keinen Supabase-Insert aus. Keine Fehler in Console, nur stummes
Nichts. Gleichzeitig teilweise App-Funktionalität (FAB BrainDump ging, + Button nicht).

Ursache: Service Worker mit stale-while-revalidate Cache-First-Strategie servierte Mix aus
alten und neuen JS-Bundles nach Deploys. Alte Context-Versionen hingen ohne gültige `member.household_id`,
sodass `addItem` am initialen `if (!member?.household_id) return` still ausstieg.

Fix (Commit chore(pwa) ...): Service Worker komplett deaktiviert, App läuft jetzt als
normale Website ohne PWA-Caching. Re-enable mit Workbox später geplant.

### RESOLVED: Zombie-Households in Supabase (April 2026)

War: 9 household_members-Rows statt 2, jeder Login erzeugte neue Orphan-Memberships.
Führte zu 406 auf `.single()`-Calls und 403 auf nachfolgenden queries.

Ursache: `household_members_insert`-Policy mit `qual = NULL` ließ beliebige Inserts zu.
Irgendein Code-Pfad (Auth-Hook?) schickte bei jedem Login einen Insert ohne Existenz-Check.

Fix: Manual DELETE der 7 Zombie-Rows per SQL. Policies blieben unverändert
— die root cause (undichter Insert-Pfad im Client) wurde nicht ermittelt, ist seitdem aber
nicht wieder aufgetreten. TODO: Bei Gelegenheit `household_members_insert`-Policy mit
`qual = (user_id = auth.uid())` härten.

---

## 📋 Modul-Status

| Modul | Status |
|-------|--------|
| Auth + PWA Shell + Navigation | ✅ Fertig |
| Einkaufsliste Nahrungsmittel | ✅ Fertig |
| AI Brain Dump (alle Module) | ✅ Fertig |
| Einkaufsliste Sonstiges | ✅ Fertig |
| To-Dos + Wöchentliche Pflichten | ✅ Fertig |
| Dashboard + Notification Center | ✅ Fertig |
| Ausgaben-Tracker | ✅ Fertig |
| Pinboard + Geburtstage | ❌ Noch nicht gebaut |
| Google Calendar Integration | ❌ Noch nicht gebaut |
| BrainDump Floating Button (alle Tabs) | ✅ Fertig |

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

## 🏗️ Architektur-Leitplanken

Lehren aus behobenen Bugs, damit sie nicht wiederkommen:

### Sticky-Positionen in `<main>`
`<main>` hat bereits `padding-top: calc(64px + env(safe-area-inset-top))` für die TopBar.
Sticky-Children in main dürfen diesen Wert NICHT nochmal als `top:` addieren. Verwende:
- `sticky top: 0` → klebt direkt unter TopBar
- `sticky top: <header-höhe>px` → klebt unter einem darüberliegenden Sticky-Element

NIEMALS: `sticky top: calc(64px + env(safe-area-inset-top) + ...)` — das führt zum
Item-überdeckt-Bug.

### Keine dynamischen Messungen für Sticky-Offsets
Wenn ein sticky-Element unter einem anderen sticky-Element kleben soll, NICHT per
`getBoundingClientRect()` + State-Update messen. Das führt zu Initial-Render-Glitches.
Stattdessen: Shopping-Header auf fixe Höhe (`min-height: 170px`) designen und den
Kategorie-Header mit konstantem Offset positionieren.

### Silent Returns in Async-Context-Methods
Methoden in Context-Providern (GroceryContext, MiscContext, etc.) die mit
`if (!member?.household_id) return;` stumm aussteigen sind gefährlich — sie schlucken
jeden Fehler ohne User-Feedback. TODO: Bei Gelegenheit durch Error-Events ersetzen
die via Notification-System sichtbar werden.

### Service Worker aktuell deaktiviert
PWA-Funktion ist im April 2026 abgeschaltet (siehe RESOLVED: Items-Hinzufügen schlägt
still fehl). Vor Re-Enable muss Workbox-basierte Network-First-Strategy implementiert
werden, nicht self-rolled Cache-Logic.

---

*FamilyHub — CLAUDE.md — Tim Wanger — April 2026*
