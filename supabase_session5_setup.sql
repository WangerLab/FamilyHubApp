-- ============================================================
-- Wanger Family Hub — Session 5: Todos + Weekly Chores
-- Run this SQL in Supabase Dashboard → SQL Editor
-- Prerequisites: Sessions 1-4 SQL must have been run
-- ============================================================

-- ============================================================
-- STEP 1: Create todos table
-- ============================================================

CREATE TABLE IF NOT EXISTS todos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_by      UUID REFERENCES auth.users(id),
  assigned_to     UUID REFERENCES auth.users(id),
  title           TEXT NOT NULL,
  priority        TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  due_date        TIMESTAMPTZ,
  completed       BOOLEAN NOT NULL DEFAULT false,
  completed_at    TIMESTAMPTZ,
  completed_by    UUID REFERENCES auth.users(id),
  comment         TEXT,
  nudge_sent_at   TIMESTAMPTZ,
  nudge_sent_by   UUID REFERENCES auth.users(id),
  archived        BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_todos_household         ON todos(household_id);
CREATE INDEX IF NOT EXISTS idx_todos_household_active  ON todos(household_id, archived, completed, due_date);
CREATE INDEX IF NOT EXISTS idx_todos_assigned          ON todos(assigned_to);

-- ============================================================
-- STEP 2: Create chores table
-- ============================================================

CREATE TABLE IF NOT EXISTS chores (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id     UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_by       UUID REFERENCES auth.users(id),
  title            TEXT NOT NULL,
  reset_frequency  TEXT NOT NULL DEFAULT '1x_week'
                     CHECK (reset_frequency IN ('1x_week','2x_week','1x_month','custom')),
  custom_days      INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chores_household ON chores(household_id);

-- ============================================================
-- STEP 3: Create chore_completions table
-- ============================================================

CREATE TABLE IF NOT EXISTS chore_completions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chore_id       UUID NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
  household_id   UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  completed_by   UUID REFERENCES auth.users(id),
  completed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  week_number    INTEGER NOT NULL,
  year           INTEGER NOT NULL,
  month          INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chore_comp_household_period
  ON chore_completions(household_id, year, week_number);
CREATE INDEX IF NOT EXISTS idx_chore_comp_household_month
  ON chore_completions(household_id, year, month);
CREATE INDEX IF NOT EXISTS idx_chore_comp_chore ON chore_completions(chore_id);

-- Auto-populate week_number / year / month from completed_at on INSERT / UPDATE
CREATE OR REPLACE FUNCTION set_chore_completion_period()
RETURNS TRIGGER AS $$
BEGIN
  NEW.week_number := EXTRACT(WEEK FROM NEW.completed_at)::INT;
  NEW.year        := EXTRACT(ISOYEAR FROM NEW.completed_at)::INT;
  NEW.month       := EXTRACT(MONTH FROM NEW.completed_at)::INT;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chore_completion_period ON chore_completions;
CREATE TRIGGER trg_chore_completion_period
  BEFORE INSERT OR UPDATE ON chore_completions
  FOR EACH ROW EXECUTE FUNCTION set_chore_completion_period();

-- ============================================================
-- STEP 4: Auto-archive function (Todos > 7 days completed)
-- Frontend calls this via supabase.rpc('archive_old_todos') on Tasks mount.
-- ============================================================

CREATE OR REPLACE FUNCTION archive_old_todos()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE todos
     SET archived = true
   WHERE household_id = get_my_household_id()
     AND completed   = true
     AND archived    = false
     AND completed_at IS NOT NULL
     AND completed_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION archive_old_todos() TO authenticated;

-- ============================================================
-- STEP 5: Enable RLS
-- ============================================================

ALTER TABLE todos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE chores             ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_completions  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 6: RLS Policies
-- ============================================================

-- todos
DROP POLICY IF EXISTS "todos_select" ON todos;
DROP POLICY IF EXISTS "todos_insert" ON todos;
DROP POLICY IF EXISTS "todos_update" ON todos;
DROP POLICY IF EXISTS "todos_delete" ON todos;

CREATE POLICY "todos_select" ON todos
  FOR SELECT USING (household_id = get_my_household_id());

CREATE POLICY "todos_insert" ON todos
  FOR INSERT WITH CHECK (
    household_id = get_my_household_id()
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "todos_update" ON todos
  FOR UPDATE USING (household_id = get_my_household_id());

CREATE POLICY "todos_delete" ON todos
  FOR DELETE USING (household_id = get_my_household_id());

-- chores
DROP POLICY IF EXISTS "chores_select" ON chores;
DROP POLICY IF EXISTS "chores_insert" ON chores;
DROP POLICY IF EXISTS "chores_update" ON chores;
DROP POLICY IF EXISTS "chores_delete" ON chores;

CREATE POLICY "chores_select" ON chores
  FOR SELECT USING (household_id = get_my_household_id());

CREATE POLICY "chores_insert" ON chores
  FOR INSERT WITH CHECK (
    household_id = get_my_household_id()
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "chores_update" ON chores
  FOR UPDATE USING (household_id = get_my_household_id());

CREATE POLICY "chores_delete" ON chores
  FOR DELETE USING (household_id = get_my_household_id());

-- chore_completions
DROP POLICY IF EXISTS "chore_completions_select" ON chore_completions;
DROP POLICY IF EXISTS "chore_completions_insert" ON chore_completions;
DROP POLICY IF EXISTS "chore_completions_delete" ON chore_completions;

CREATE POLICY "chore_completions_select" ON chore_completions
  FOR SELECT USING (household_id = get_my_household_id());

CREATE POLICY "chore_completions_insert" ON chore_completions
  FOR INSERT WITH CHECK (
    household_id = get_my_household_id()
    AND auth.uid() IS NOT NULL
  );

-- Let users undo their own completion
CREATE POLICY "chore_completions_delete" ON chore_completions
  FOR DELETE USING (
    household_id = get_my_household_id()
    AND completed_by = auth.uid()
  );

-- ============================================================
-- STEP 7: Enable Realtime
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE todos;
ALTER PUBLICATION supabase_realtime ADD TABLE chores;
ALTER PUBLICATION supabase_realtime ADD TABLE chore_completions;

-- ============================================================
-- DONE — Session 5 ready.
-- ============================================================
