-- ============================================================
-- Wanger Family Hub — Session 4: Sonstiges (Misc) Shopping List
-- Run this SQL in Supabase Dashboard → SQL Editor
-- Prerequisites: Session 1+2 SQL must have been run
-- ============================================================

-- ============================================================
-- STEP 1: Create misc_items table
-- ============================================================

CREATE TABLE IF NOT EXISTS misc_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES auth.users(id),
  name          TEXT NOT NULL,
  location_tag  TEXT NOT NULL DEFAULT 'Sonstiges',
  note          TEXT,
  checked       BOOLEAN NOT NULL DEFAULT false,
  checked_at    TIMESTAMPTZ,
  checked_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_misc_items_household_id ON misc_items(household_id);
CREATE INDEX IF NOT EXISTS idx_misc_items_checked      ON misc_items(household_id, checked);
CREATE INDEX IF NOT EXISTS idx_misc_items_created      ON misc_items(household_id, created_at DESC);

-- ============================================================
-- STEP 2: Enable RLS
-- ============================================================

ALTER TABLE misc_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 3: RLS Policies (reuse get_my_household_id() from Session 1)
-- ============================================================

DROP POLICY IF EXISTS "misc_items_select" ON misc_items;
DROP POLICY IF EXISTS "misc_items_insert" ON misc_items;
DROP POLICY IF EXISTS "misc_items_update" ON misc_items;
DROP POLICY IF EXISTS "misc_items_delete" ON misc_items;

CREATE POLICY "misc_items_select" ON misc_items
  FOR SELECT
  USING (household_id = get_my_household_id());

CREATE POLICY "misc_items_insert" ON misc_items
  FOR INSERT
  WITH CHECK (
    household_id = get_my_household_id()
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "misc_items_update" ON misc_items
  FOR UPDATE
  USING (household_id = get_my_household_id());

CREATE POLICY "misc_items_delete" ON misc_items
  FOR DELETE
  USING (household_id = get_my_household_id());

-- ============================================================
-- STEP 4: Enable Realtime
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE misc_items;

-- ============================================================
-- DONE — Session 4 ready.
-- ============================================================
