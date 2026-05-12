-- Sprint M-8: Add superseded state to project_microtasks
-- Used by Review-Modus to mark tasks as historically completed
-- but no longer relevant to the project's future.
-- Tasks with superseded_at IS NOT NULL remain visible (grayed-out)
-- but are excluded from progress calculations.

ALTER TABLE public.project_microtasks
  ADD COLUMN superseded_at timestamptz NULL,
  ADD COLUMN superseded_reason text NULL;

CREATE INDEX IF NOT EXISTS idx_project_microtasks_superseded_at
  ON public.project_microtasks (superseded_at)
  WHERE superseded_at IS NOT NULL;
