-- ============================================================
-- Wanger Family Hub — Supabase Database Setup
-- Run this SQL in Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- STEP 1: Create Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS households (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS household_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  color        TEXT NOT NULL DEFAULT '#3B82F6',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(household_id, user_id)
);

-- Index for fast member lookups
CREATE INDEX IF NOT EXISTS idx_household_members_user_id
  ON household_members(user_id);

CREATE INDEX IF NOT EXISTS idx_household_members_household_id
  ON household_members(household_id);

-- ============================================================
-- STEP 2: Enable Row Level Security
-- ============================================================

ALTER TABLE households        ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 3: Helper function (SECURITY DEFINER to avoid RLS recursion)
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_household_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT household_id
  FROM household_members
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- ============================================================
-- STEP 4: RLS Policies — households
-- ============================================================

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "households_select" ON households;
DROP POLICY IF EXISTS "households_insert" ON households;

-- SELECT: only if the caller is a member of this household
CREATE POLICY "households_select" ON households
  FOR SELECT
  USING (id = get_my_household_id());

-- INSERT: any authenticated user can create a household (used as fallback)
CREATE POLICY "households_insert" ON households
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- STEP 5: RLS Policies — household_members
-- ============================================================

DROP POLICY IF EXISTS "household_members_select" ON household_members;
DROP POLICY IF EXISTS "household_members_insert" ON household_members;
DROP POLICY IF EXISTS "household_members_update" ON household_members;

-- SELECT: own record OR any member of same household
CREATE POLICY "household_members_select" ON household_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR household_id = get_my_household_id()
  );

-- INSERT: user can only insert their own member record
CREATE POLICY "household_members_insert" ON household_members
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: user can only update their own member record
CREATE POLICY "household_members_update" ON household_members
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- STEP 6: Pre-populate household data
-- ============================================================
-- After creating Tim and Iris accounts in Supabase Auth:
-- 1. Find their user IDs in Auth → Users
-- 2. Run the INSERT statements below

-- Create the shared household
INSERT INTO households (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Wanger Family Hub')
ON CONFLICT (id) DO NOTHING;

-- Add Tim (replace <TIM_USER_ID> with Tim's actual auth.users UUID)
-- INSERT INTO household_members (household_id, user_id, display_name, color)
-- VALUES (
--   '00000000-0000-0000-0000-000000000001',
--   '<TIM_USER_ID>',
--   'Tim',
--   '#3B82F6'
-- )
-- ON CONFLICT (household_id, user_id) DO NOTHING;

-- Add Iris (replace <IRIS_USER_ID> with Iris's actual auth.users UUID)
-- INSERT INTO household_members (household_id, user_id, display_name, color)
-- VALUES (
--   '00000000-0000-0000-0000-000000000001',
--   '<IRIS_USER_ID>',
--   'Iris',
--   '#F43F5E'
-- )
-- ON CONFLICT (household_id, user_id) DO NOTHING;

-- ============================================================
-- DONE
-- The app will automatically create a household if the user
-- doesn't have one yet (fallback for edge cases).
-- ============================================================
