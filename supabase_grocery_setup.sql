-- ============================================================
-- Wanger Family Hub — Session 2: Grocery List
-- Run this SQL in Supabase Dashboard → SQL Editor
-- Prerequisites: Session 1 SQL must have been run first
--   (tables: households, household_members, function: get_my_household_id)
-- ============================================================

-- ============================================================
-- STEP 1: Create grocery_items table
-- ============================================================

CREATE TABLE IF NOT EXISTS grocery_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_by   UUID REFERENCES auth.users(id),
  name         TEXT NOT NULL,
  category     TEXT NOT NULL,
  quantity     NUMERIC DEFAULT 1,
  unit         TEXT,
  note         TEXT,
  checked      BOOLEAN NOT NULL DEFAULT false,
  checked_at   TIMESTAMPTZ,
  checked_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_grocery_items_household_id ON grocery_items(household_id);
CREATE INDEX IF NOT EXISTS idx_grocery_items_checked     ON grocery_items(household_id, checked);

-- ============================================================
-- STEP 2: Enable RLS
-- ============================================================

ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 3: RLS Policies (reuse get_my_household_id() from Session 1)
-- ============================================================

DROP POLICY IF EXISTS "grocery_items_select" ON grocery_items;
DROP POLICY IF EXISTS "grocery_items_insert" ON grocery_items;
DROP POLICY IF EXISTS "grocery_items_update" ON grocery_items;
DROP POLICY IF EXISTS "grocery_items_delete" ON grocery_items;

-- SELECT: only items that belong to the caller's household
CREATE POLICY "grocery_items_select" ON grocery_items
  FOR SELECT
  USING (household_id = get_my_household_id());

-- INSERT: only into the caller's own household
CREATE POLICY "grocery_items_insert" ON grocery_items
  FOR INSERT
  WITH CHECK (
    household_id = get_my_household_id()
    AND auth.uid() IS NOT NULL
  );

-- UPDATE: any member of the household can update items
CREATE POLICY "grocery_items_update" ON grocery_items
  FOR UPDATE
  USING (household_id = get_my_household_id());

-- DELETE: any member of the household can delete items
CREATE POLICY "grocery_items_delete" ON grocery_items
  FOR DELETE
  USING (household_id = get_my_household_id());

-- ============================================================
-- STEP 4: Enable Realtime
-- Run this to broadcast INSERT/UPDATE/DELETE to all connected clients
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE grocery_items;

-- ============================================================
-- DONE
-- After running this SQL:
-- 1. Go to Supabase Dashboard → Table Editor → grocery_items
--    → "Realtime" tab and confirm it's enabled (or it may already
--    be active from the ALTER PUBLICATION command above).
-- 2. The app will now show live updates when either Tim or Iris
--    adds, checks, or deletes items.
-- ============================================================
