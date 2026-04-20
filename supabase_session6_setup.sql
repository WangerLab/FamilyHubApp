-- ============================================================
-- Wanger Family Hub — Session 6: Activity Log / Notifications
-- Run in Supabase SQL Editor. Prereqs: Sessions 1-5.
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id        UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  actor_id            UUID REFERENCES auth.users(id),
  action_type         TEXT NOT NULL CHECK (action_type IN (
                        'grocery_add','grocery_check',
                        'misc_add','misc_check',
                        'todo_create','todo_complete','todo_nudge',
                        'chore_complete',
                        'expense_add'
                      )),
  module              TEXT NOT NULL CHECK (module IN ('grocery','misc','todos','chores','expenses')),
  item_id             UUID,
  description         TEXT NOT NULL,
  read_by_user_ids    UUID[] NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_household_created
  ON activity_log(household_id, created_at DESC);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_log_select" ON activity_log;
DROP POLICY IF EXISTS "activity_log_insert" ON activity_log;
DROP POLICY IF EXISTS "activity_log_update" ON activity_log;

CREATE POLICY "activity_log_select" ON activity_log
  FOR SELECT USING (household_id = get_my_household_id());

CREATE POLICY "activity_log_insert" ON activity_log
  FOR INSERT WITH CHECK (
    household_id = get_my_household_id()
    AND auth.uid() IS NOT NULL
  );

-- Allow any household member to mark entries read (updates only read_by_user_ids)
CREATE POLICY "activity_log_update" ON activity_log
  FOR UPDATE USING (household_id = get_my_household_id());

-- ============================================================
-- RPC: mark_all_notifications_read() — appends current user id to
-- read_by_user_ids for all unread entries in this household.
-- Returns the number of rows updated.
-- ============================================================
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid  UUID := auth.uid();
  v_hid  UUID := get_my_household_id();
  v_count INTEGER;
BEGIN
  IF v_uid IS NULL OR v_hid IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE activity_log
     SET read_by_user_ids = array_append(read_by_user_ids, v_uid)
   WHERE household_id = v_hid
     AND NOT (v_uid = ANY (read_by_user_ids));
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_all_notifications_read() TO authenticated;

-- ============================================================
-- Enable Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;

-- ============================================================
-- DONE — Session 6 ready.
-- ============================================================
