# Wanger Family Hub — PRD

## Overview
Private family household management PWA for Tim (husband) and Iris (wife). Two-user app with shared household, no public signup. Built on React + Supabase.

**App URL:** https://076a4004-de1a-4c9f-9df7-311f47147d29.preview.emergentagent.com  
**Supabase project:** https://zogptaadljxxoltxgjjm.supabase.co

---

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React PWA, mobile-first 375–412px |
| Auth & DB | Supabase (Auth + PostgreSQL + Realtime) |
| Backend | FastAPI (minimal, health check only) |
| Deployment | Emergent |

### Key Files
- `src/supabaseClient.js` — Singleton Supabase client
- `src/contexts/AuthContext.js` — Auth state, household loading, visibility-change reconnect
- `src/contexts/ThemeContext.js` — Dark/light mode, system preference + manual toggle
- `src/components/LoginPage.jsx` — Email/password login
- `src/components/AppShell.jsx` — PWA shell, install banners
- `src/components/TopBar.jsx` — User avatar + name + theme toggle
- `src/components/BottomNav.jsx` — 5-tab navigation
- `src/components/tabs/` — HomeTab, ShoppingTab, TasksTab, ChoresTab, MoreTab
- `public/manifest.json` — PWA manifest (name: Wanger Family Hub)
- `public/sw.js` — Service worker for offline caching

---

## Database Schema (Supabase)

```sql
households: id (uuid PK), name (text), created_at (timestamptz)
household_members: id (uuid PK), household_id (uuid FK), user_id (uuid FK → auth.users),
  display_name (text), color (text default '#3B82F6'), created_at (timestamptz)
```

### RLS Policies
- **households SELECT**: `id = get_my_household_id()` (SECURITY DEFINER function)
- **households INSERT**: any authenticated user (fallback for new users)
- **household_members SELECT**: `user_id = auth.uid() OR household_id = get_my_household_id()`
- **household_members INSERT**: `user_id = auth.uid()`
- **household_members UPDATE**: `user_id = auth.uid()`

---

## Users

| User | Email | Color | Device |
|---|---|---|---|
| Tim | tmp.wanger@gmail.com | #3B82F6 (Blue) | Android, Pixel 10 XL, Chrome |
| Iris | irismelanie.wanger@gmail.com | #F43F5E (Rose) | iPhone 16, Safari |

---

## Implemented Features (MVP — Session 1, April 2026)

- [x] Email/password login via Supabase Auth
- [x] Logout
- [x] User display name + color in top bar (from household_members)
- [x] Household auto-setup on first login (fallback if no DB record)
- [x] Bottom tab navigation — 5 tabs: Home, Shopping, Tasks, Chores, More
- [x] URL-based routing — navigation survives page refresh
- [x] Friendly empty states on all 5 tabs (no blank screens)
- [x] Dark mode: system preference auto-detect + manual override + reset to auto
- [x] PWA manifest (name: Wanger Family Hub, short_name: FamilyHub)
- [x] Service worker for offline shell caching
- [x] Safe-area CSS (env safe-area-inset-*) for iPhone 16 Dynamic Island
- [x] Reconnect-safe Supabase sessions (visibilitychange handler — iOS fix)
- [x] iOS install banner (Share → Add to Home Screen instructions)
- [x] Android install banner (beforeinstallprompt)
- [x] Profile settings in More tab: change color, change display name
- [x] Min 44px+ touch targets everywhere
- [x] No hover-only interactions (active: states used)
- [x] Fonts: Manrope (headings) + DM Sans (body)
- [x] Dark/light mode theme settings in More tab (Follow System / Light / Dark)

## Implemented Features (Session 2 — Grocery List, April 2026)

- [x] Grocery list module on Shopping tab (Einkaufsliste)
- [x] Add item by typing + Enter or + button
- [x] Auto-category detection by keyword matching (German keywords, 9 categories)
- [x] Live emoji preview while typing item name
- [x] Auto unit suggestion per item (g, L, Stück, Packung, etc.)
- [x] Items grouped by 9 fixed Aldi-layout categories with sticky section headers
- [x] Category order: Obst→Fleisch→Bäckerei→Milch→Kühlregal→Konserven→Gewürze→Getränke→Snacks
- [x] Inline quantity + unit editing (tap quantity to edit)
- [x] Per-item note field (tap note icon to expand textarea)
- [x] Manual category override via CategoryPicker bottom sheet
- [x] Checked items: strikethrough + faded
- [x] Swipe-left to reveal delete button
- [x] Undo snackbar (5s) — "Rückgängig" button
- [x] Reset list button with confirmation dialog
- [x] Shopping mode toggle ("Einkaufen"/"Fertig") — larger 56px checkboxes, checked items sorted to bottom
- [x] Creator color dot on each item (Tim=blue, Iris=rose)
- [x] Supabase Realtime subscription — live sync between Tim & Iris
- [x] Red badge on Shopping tab (bottom nav) showing unchecked item count
- [x] Friendly empty state in German
- [x] Scroll to newly added item's category

## Implemented Features (Session 3 — AI Brain Dump Parser, April 2026)

- [x] FastAPI backend endpoint `POST /api/brain-dump/parse`
- [x] Anthropic Claude (claude-sonnet-4-5-20250929) via `emergentintegrations` + `EMERGENT_LLM_KEY`
- [x] Structured JSON extraction: name, quantity, unit, category, note
- [x] Auto-mapping to the 9 fixed German categories (Obst & Gemüse … Snacks & Süsses)
- [x] Unit whitelist: Stück, g, kg, ml, L, Packung, Dose, Flasche, Bund, Glas
- [x] Validation: non-empty text, max 500 chars, user_id required
- [x] In-memory rate limit: 10 req/user/hour — returns 429 + Retry-After header
- [x] 15s timeout via `asyncio.wait_for` + single retry on failure
- [x] Token/duration logging per call
- [x] Frontend `BrainDump.jsx` — collapsible section above grocery list
- [x] Textarea with live 0/500 char counter (amber <50, red at cap)
- [x] "KI-Parse" button with loading spinner ("KI denkt nach…")
- [x] Editable preview rows: checkbox select/deselect, inline edit name/qty/unit/category/note, remove button
- [x] Bulk "N hinzufügen" saves selected items via `GroceryContext.addItem`
- [x] After save: textarea cleared + section auto-collapsed (per user preference)
- [x] Rate-limit error UI with live countdown timer until reset
- [x] Sticky header preserved (AddItemInput + BrainDump both pinned under page header)
- [x] Regression test suite at `/app/backend/tests/test_brain_dump.py`

## Implemented Features (Session 4 — Sonstiges Shopping List, April 2026)

- [x] New Supabase table `misc_items` with RLS (same pattern as grocery_items) + Realtime
- [x] SQL migration script at `/app/supabase_misc_setup.sql` (user runs in Supabase SQL editor)
- [x] Segmented control in Shopping tab: "Nahrungsmittel" | "Sonstiges" (persisted via localStorage)
- [x] Predefined location tags with emoji: Apotheke 💊, Baumarkt 🔨, Drogerie 🧴, Zoohandlung 🐾, Kleidung 👕, Sonstiges 📦
- [x] Custom user-defined location tags (arbitrary strings saved per item)
- [x] AddMiscItemInput with tag picker (data-testid `add-misc-input`)
- [x] MiscItemRow: checkbox toggle + strikethrough, swipe-left delete, undo snackbar, note editing
- [x] Items grouped by `location_tag` with sticky headers (predefined order first, custom A→Z)
- [x] Brain Dump mode-aware: `POST /api/brain-dump/parse` accepts `mode: grocery|misc` (default grocery = backwards compat). New misc system prompt with location-tag heuristics (Ibuprofen→Apotheke, Schrauben→Baumarkt, Shampoo→Drogerie, Hundefutter→Zoohandlung, Socken→Kleidung, others→Sonstiges)
- [x] BrainDump component accepts `mode` prop; preview shows only location dropdown for misc (no qty/unit/category)
- [x] Rate limit (10/h) shared across both modes per user
- [x] Bottom-nav Shopping badge: split "N·M" when both counts >0, single number otherwise
- [x] Reset list respects active sub-tab (only grocery OR only misc)
- [x] Shopping mode toggle ("Einkaufen/Fertig") hidden on Sonstiges sub-tab
- [x] Regression test suites: `/app/backend/tests/test_brain_dump.py` + `test_brain_dump_misc.py` (12/12 green)

## Implemented Features (Session 5 — Todos + Weekly Chores, April 2026)

- [x] 3 neue Supabase-Tabellen: `todos`, `chores`, `chore_completions` + RLS + Realtime + Trigger für week/year/month + RPC `archive_old_todos()` (Session 5 SQL: `/app/supabase_session5_setup.sql`)
- [x] Echtes `archived` Feld + server-seitige Funktion (User-Wahl **b**)
- [x] In-App Nudge-Toast über Realtime (User-Wahl **x**) — 24h Cooldown pro Todo
- [x] Smart-Date Parser (DE): morgen, heute, übermorgen, in N Tagen, Ende der Woche, nächste Woche, Wochentage
- [x] AddTodoInput mit Priority-Chips (Hoch/Mittel/Niedrig), Assignee, Datetime-Picker, Smart-Date-Hint mit Klick-zum-Übernehmen
- [x] TodoRow: Priority-Farb-Streifen links, Overdue Red-Glow-Pulse-Animation, Checkbox, ⚡ Quick-Done-Emoji (erledigt vor due_date), Nudge-Button (mit 24h-Cooldown), Expandable Kommentar, Swipe-Delete
- [x] Collapsible „Erledigt" + „Archiv" Sektionen auf Tasks-Tab
- [x] AddChoreInput mit Frequency-Chips (1×/2×/Monat/Custom-Tage)
- [x] ChoreCard: Progress-Bar, Completion-Dots mit Member-Farben (Tim=blau, Iris=rose), Erledigt/Rückgängig-Toggle
- [x] Reset-Logic ohne Cron: Period-Filter via ISO-Week/Monat (Completions bleiben historisch erhalten)
- [x] Gamification-Bar `WeeklyStats` (wiederverwendet): „Diese Woche erledigt: Tim N / Iris M 🏆"
- [x] Brain Dump `mode="todos"`: Extrahiert title/priority/due_date/assignee_hint/comment. **HEUTE-Injection** → Claude gibt frische 2026-Dates. Post-Processor nullt veraltete/fehlerhafte Dates.
- [x] Backend: 18/18 pytest grün (6 grocery + 6 misc + 6 todos inkl. Rate-Limit über 3 Modi)
- [x] Frontend: Self-tested — Smart-Date-Hints, AddTodo/AddChore Formulare, Brain Dump todos Flow (Parse → Preview mit 2 Items + korrekten Assignees) alle funktionieren

## Implemented Features (Session 6 — Dashboard + Notification Center, April 2026)

- [x] Neue Tabelle `activity_log` + RLS + Realtime + RPC `mark_all_notifications_read()` (SQL: `/app/supabase_session6_setup.sql`, bereits vom User ausgeführt)
- [x] `ActivityContext` mit logActivity/markAllRead/unreadCount + Realtime-Subscription
- [x] Fire-and-forget logActivity-Calls in GroceryContext, MiscContext, TodosContext, ChoresContext — Primär-Operationen bleiben unberührt wenn Log fehlschlägt
- [x] Brain Dump Aggregate-Log: statt N Einzel-Einträge EIN „hat per KI Brain Dump {N} Items hinzugefügt"
- [x] **TopBar Bell** mit Unread-Badge (rechts neben User-Info, User-Wahl **x**)
- [x] **Notification Panel** als **Bottom-Sheet** (User-Wahl **a**) mit slide-up Animation, max 50 Einträge, timeAgo Labels, pro action_type Farben/Icons, unlesen = blauer Dot + blaue Hintergrund-Tönung, „Alle gelesen" Button mit optimistic update + Revert bei RPC-Fehler
- [x] **DashboardHome** ersetzt Home-Placeholder: Zeitbasierter Greeting (Morgen/Tag/Abend), 4 tappable Cards:
  - Aktuell wichtig (high priority + <48h, max 3, Overdue=rot hervorgehoben)
  - Einkaufsliste (Nahrungsmittel + Sonstiges Gesamt-Count, farbige Dots)
  - Wiederkehrendes (offene Chores diese Periode, max 3 sichtbar)
  - Geburtstage (Session 8 Placeholder)
- [x] Card-Navigation: Tap → entsprechender Tab
- [x] Testing: Backend 18/18 pytest regression grün, Frontend alle direkt-testbaren Flows 100% (Dashboard render, 4 Cards, 3 Card-Navigations, Bell+Panel+MarkAllRead, Realtime activity log für todo create), keine Console-Errors, alle Sessions 1-5 Regressions grün

## Implemented Features (Session 7 — Expenses + Weekly Recap, April 2026)

- [x] Neue Tabellen `expenses` + `monthly_balance_archive` mit Trigger für `month_key` Auto-Populate + RLS + Realtime (SQL: `/app/supabase_session7_setup.sql`)
- [x] `ExpensesContext` mit Balance-Berechnung (50/50 Split), Realtime, Monats-Filter, Archiv-Liste
- [x] `BalanceCard`: große quitt/owed-Display mit User-Color, Settlement-Button
- [x] `AddExpenseInput`: Description + Amount (EUR Format) + Date + Paid-By Chips + Kategorie-Tags
- [x] `ExpenseRow`: Datum, Beschreibung, Paid-By-Dot mit User-Farbe, Kategorie-Chip, Löschen, Settlements mit Icon/Italic
- [x] `ExpensesTab` (Route `/expenses`) mit Settlement-Prefill-Flow, Archivieren-Dialog + carryOver Berechnung, Archive-Liste collapsible (letzte 12 Monate)
- [x] Brain Dump **mode="expense"**: Extraktion von `description/amount/category/expense_date`. HEUTE-Injection auch für expense. Stale-Dates (>60d) nulled. Preview zeigt Amount+Kategorie+PaidBy Dropdowns.
- [x] MoreTab: „Module"-Sektion mit Ausgaben-Link → `/expenses`
- [x] Dashboard: Neue Ausgaben-Card (Balance/quitt Anzeige, Tap → /expenses)
- [x] **Weekly Family Recap** Card auf Dashboard: aggregiert letzte 7 Tage (Todos completed per user, Chores completions, Shopping-Adds/Checks aus activity_log). 🏆 Trophy für Top-Performer. Mood-Line je nach Aktivitätsvolumen. Rendert jetzt IMMER (mit „Diese Woche noch ruhig 🌿" Fallback).
- [x] Activity-Log Integration für expense_add (+settlement-Variante)
- [x] **Backend 25/25 pytest grün** (inkl. 7 neue expense-Tests: EUR-Amounts, Kategorien, gestern→Date, stale-null, 4-Modi Rate-Limit)
- [x] **Frontend E2E verifiziert**: /expenses Route, BalanceCard quitt, Tim 100€ → Iris schuldet Tim 50,00€ (50/50 Split korrekt!), Settlement-Button, MoreTab-Link, Dashboard-Ausgaben-Card mit Live-Balance, WeeklyRecap sichtbar

## SQL Setup Required

Run `/app/supabase_grocery_setup.sql` in Supabase Dashboard → SQL Editor to activate the grocery list.

---

## P0 Backlog (Next Sessions)

| Feature | Tab | Priority |
|---|---|---|
| Grocery list (add/check/delete items, real-time sync) | Shopping | P0 |
| To-do list with assignments | Tasks | P0 |
| Weekly rotating chores | Chores | P0 |
| Shared expense tracker | More | P1 |
| Family calendar | More | P1 |
| Push notifications | — | P2 |
| AI assistant features | — | P2 |

---

## Setup Instructions

1. Run `/app/supabase_setup.sql` in Supabase Dashboard → SQL Editor
2. Insert Tim and Iris member records (see SQL Step 6 — replace UUIDs with actual auth.users IDs)
3. Both users log in with email/password credentials

## Notes

- The `household_members` records must be pre-populated via SQL for Tim and Iris to appear with their correct names and colors. The app has a fallback that creates a household on first login.
- The service worker caches the app shell for offline use; Supabase data requires connectivity.
- All Supabase calls are in the frontend — the FastAPI backend is not used for this MVP.
