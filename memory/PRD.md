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
