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
        MiscItemRow.jsx
        AddMiscItemInput.jsx
      tasks/ chores/ expenses/   ← eigene Subordner pro Modul
    contexts/             ← GroceryContext, MiscContext, TodosContext, etc.
    constants/            ← categories.js, miscLocations.js
  api/
    brain-dump/
      parse.js          ← Claude Sonnet — Fließtext → strukturierte Items
    categorize/
      suggest.js        ← Claude Haiku — Single-Item-Classifier, Rate 30/h/User
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
| Auth + Shell + Navigation | ✅ Fertig |
| 🛒 Einkaufsliste Nahrungsmittel (12 Kategorien, KI-Hybrid) | ✅ Fertig |
| 📦 Einkaufsliste Sonstiges (10 Locations, KI-Hybrid) | ✅ Fertig |
| 📋 To-Dos (Priorität, Deadlines, Nudges) | ✅ Fertig |
| 🔄 Wöchentliche Pflichten | ✅ Fertig |
| 💰 Ausgaben-Tracker (Balance, 50/50, Monatsarchiv) | ✅ Fertig |
| 🏠 Dashboard + 🔔 Notification Center | ✅ Fertig |
| 🤖 AI Brain Dump (alle items-Module) | ✅ Fertig |
| 🤖 Category Suggester (Haiku-Fallback) | ✅ Fertig |
| 📌 Pinboard | ❌ Geplant |
| 🎂 Geburtstage & Jahrestage | ❌ Geplant |
| 📅 Google Calendar Integration | ❌ Geplant |

---

## 👥 User Setup

| | Tim | Iris |
|---|---|---|
| Gerät | Android Pixel 10 XL | iPhone 16 |
| Browser | Chrome (PWA nativ) | Safari (manuell installieren) |
| Farbe | #EC4899 Pink | #2563EB Blau |
| Farbe wählbar? | Ja — im Profil einstellbar | Ja — im Profil einstellbar |

---

## 🔄 Workflow

**Hinweis:** Seit April 2026 komplett über Claude Code im Terminal — Emergent.sh
ist nicht mehr aktiv. Commit-Prompts werden im Chat von Claude Opus verfasst,
Ausführung durch Claude Code (Sonnet) lokal.

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

## 🛒 Einkaufsliste — Kategorien & Locations

### Grocery-Kategorien (12, Aldi-Reihenfolge)
Definiert in `frontend/src/constants/categories.js`:
produce (🥬 Obst & Gemüse), bakery (🥖 Bäckerei & Brot), fish (🐟 Fisch & Meeresfrüchte),
protein (🥩 Protein — pflanzlich, tierisch, Eier),
dairy (🥛 Milchprodukte pflanzlich & Milch), cheese (🧀 Käse & Aufschnitt),
frozen (❄️ Tiefkühl), dry (🌾 Trockenwaren & Backen), canned (🥫 Konserven & Saucen),
spices (🌶️ Gewürze & Öl), drinks (🥤 Getränke), snacks (🍫 Snacks & Süßes).

### Misc-Locations (10)
Definiert in `frontend/src/constants/miscLocations.js`:
apotheke (💊), baumarkt (🔨), hygiene (🧴 — ersetzt früheres "Drogerie"),
haushalt (🏠), zoohandlung (🐾), kleidung (👕), buero (📚 Bücher & Büro),
elektro (🔌 Elektro & Technik), geschenke (🎁), sonstiges (📦 Default-Fallback).

### Wichtig
- Custom-Tags wurden entfernt — Items müssen in die fixen Kategorien
- Korrektur über klickbares Kategorie/Location-Badge am Item
- Keywords-Listen sind großzügig (~1000 Grocery, ~500 Misc) — "Mehl" muss in `dry` landen, nicht in `canned`

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

### Hybrid-Kategorisierung: Keyword-first, KI-fallback
Beim Anlegen eines Items (Grocery oder Misc) zuerst Keyword-Liste durchsuchen.
Match → sofort in richtiger Kategorie. Kein Match → Item landet in Default
(`sonstiges`-Location bzw. `snacks`-Kategorie), asynchroner Call an
`/api/categorize/suggest` läuft, Item springt in KI-Kategorie wenn Antwort kommt.
Fehler werden silent geschluckt, kein User-Feedback. Rate-Limit 30/h pro User.
NICHT blockieren, NICHT auf Antwort warten vor dem Insert.

### NULL ist der richtige Default für quantity/unit
Grocery-Items haben `quantity=NULL` und `unit=NULL` solange der User nichts
angegeben hat. Kein Fake-Default "1 Stück" mehr. Das muss an DREI Stellen
gleichzeitig eingehalten werden:
1. `AddItemInput` (Plus-Button-Pfad)
2. `/api/brain-dump/parse.js` (Prompt + normalizeGrocery)
3. `GroceryContext.addItem` (Insert-Pfad)
Wenn irgendwo ein Default reinkriecht, entstehen wieder "1 Packung"-Phantome.

### Creator-Signal steht im Text-Tag, nicht in der Checkbox
Die Checkbox ist IMMER neutral grau (unchecked) oder emerald (checked) —
unabhängig vom Creator. Die Creator-Farbe steht NUR im kleinen Text-Tag
oben rechts am Item ("Tim" in Pink, "Iris" in Blau). Erfolgs-Signal
und Creator-Signal sind bewusst entkoppelt.

### Panel-Pattern für Item-Details
Menge, Einheit, Notiz eines Items werden in einem einzigen ausklappbaren
Panel unterhalb des Items editiert — nicht inline. Default zu. Öffnen per
Tap auf einen der drei Trigger (Menge-in-Klammern am Namen, "+ Menge"-Link,
Notiz-Icon rechts). Zweiter Tap auf denselben Trigger schließt wieder.
Enter speichert + schließt. onBlur speichert + schließt. Pattern ist für
Grocery + Misc identisch und soll für zukünftige Tabs übernommen werden.

### Layout: Mobile full-width, Desktop-Cap 480px ab sm:
Tailwind-Breakpoint `sm:` (≥640px Viewport) cappt auf 480px. Darunter keine
Begrenzung. Das löst die schwarzen Balken auf Pixel 10 Pro XL. Gilt überall
wo vorher `max-w-[412px]` stand — also AppShell (3 Stellen), BottomNav,
TopBar, NotificationPanel, Toast-Container (Shopping + Nudge), CategoryPicker,
BrainDumpSheet. Neue Komponenten die am oberen/unteren Rand ankleben müssen
dieses Pattern übernehmen.

---

*FamilyHub — CLAUDE.md — Tim Wanger — April 2026*
