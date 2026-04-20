-- ============================================================
-- Wanger Family Hub — Session 7: Expense Tracker
-- Prereqs: Sessions 1-6 SQL.
-- ============================================================

CREATE TABLE IF NOT EXISTS expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  paid_by         UUID NOT NULL REFERENCES auth.users(id),
  amount          NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  description     TEXT NOT NULL,
  category        TEXT,
  expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  month_key       TEXT NOT NULL,
  is_settlement   BOOLEAN NOT NULL DEFAULT false,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_household_month
  ON expenses(household_id, month_key, expense_date DESC);

CREATE TABLE IF NOT EXISTS monthly_balance_archive (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id            UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  month_key               TEXT NOT NULL,
  totals_by_user          JSONB NOT NULL DEFAULT '{}'::jsonb,
  balance_carried_over    NUMERIC(12,2) NOT NULL DEFAULT 0,
  archived_by             UUID REFERENCES auth.users(id),
  archived_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (household_id, month_key)
);

-- ============================================================
-- Auto-populate month_key from expense_date
-- ============================================================
CREATE OR REPLACE FUNCTION set_expense_month_key()
RETURNS TRIGGER AS $$
BEGIN
  NEW.month_key := to_char(NEW.expense_date, 'YYYY-MM');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_expense_month_key ON expenses;
CREATE TRIGGER trg_expense_month_key
  BEFORE INSERT OR UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_expense_month_key();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE expenses                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_balance_archive  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_select" ON expenses;
DROP POLICY IF EXISTS "expenses_insert" ON expenses;
DROP POLICY IF EXISTS "expenses_update" ON expenses;
DROP POLICY IF EXISTS "expenses_delete" ON expenses;

CREATE POLICY "expenses_select" ON expenses
  FOR SELECT USING (household_id = get_my_household_id());
CREATE POLICY "expenses_insert" ON expenses
  FOR INSERT WITH CHECK (
    household_id = get_my_household_id() AND auth.uid() IS NOT NULL
  );
CREATE POLICY "expenses_update" ON expenses
  FOR UPDATE USING (household_id = get_my_household_id());
CREATE POLICY "expenses_delete" ON expenses
  FOR DELETE USING (household_id = get_my_household_id());

DROP POLICY IF EXISTS "mba_select" ON monthly_balance_archive;
DROP POLICY IF EXISTS "mba_insert" ON monthly_balance_archive;
DROP POLICY IF EXISTS "mba_delete" ON monthly_balance_archive;

CREATE POLICY "mba_select" ON monthly_balance_archive
  FOR SELECT USING (household_id = get_my_household_id());
CREATE POLICY "mba_insert" ON monthly_balance_archive
  FOR INSERT WITH CHECK (
    household_id = get_my_household_id() AND auth.uid() IS NOT NULL
  );
CREATE POLICY "mba_delete" ON monthly_balance_archive
  FOR DELETE USING (household_id = get_my_household_id());

-- ============================================================
-- Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE monthly_balance_archive;

-- ============================================================
-- DONE — Session 7 ready.
-- ============================================================
