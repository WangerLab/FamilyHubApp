-- Sprint M-9 B-1: Enforce single priority project per household
-- Partial unique index: only rows where priority = true are indexed,
-- so the constraint fires only for prio-true rows — non-priority
-- projects are completely unaffected.
-- Companion RPC set_priority_project (B-3) will clear the old prio
-- before setting the new one inside the same transaction.

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_one_priority_per_household
  ON public.projects (household_id)
  WHERE priority = true;
