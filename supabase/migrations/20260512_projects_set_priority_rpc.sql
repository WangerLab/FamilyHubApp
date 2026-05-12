-- Sprint M-9 B-3a: RPC set_priority_project
-- Atomically clears any existing priority project in the household,
-- then optionally sets a new one with date range.
-- Pass p_project_id = NULL to clear priority entirely (no new prio set).
-- Works in tandem with the partial unique index from B-1
-- (idx_projects_one_priority_per_household) — the clear-then-set order
-- ensures the index is never violated during the transaction.
-- SECURITY DEFINER + search_path = public for RLS-bypass with household check.

CREATE OR REPLACE FUNCTION public.set_priority_project(
  p_project_id uuid,
  p_priority_start date DEFAULT NULL,
  p_priority_end date DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_household_id uuid;
BEGIN
  v_household_id := get_my_household_id();

  IF v_household_id IS NULL THEN
    RAISE EXCEPTION 'No household for current user';
  END IF;

  -- Step 1: clear any existing priority in this household
  UPDATE projects
  SET priority = false,
      priority_start = NULL,
      priority_end = NULL,
      updated_at = NOW()
  WHERE household_id = v_household_id
    AND priority = true;

  -- Step 2: if a project_id is given, set it as new priority
  IF p_project_id IS NOT NULL THEN
    UPDATE projects
    SET priority = true,
        priority_start = p_priority_start,
        priority_end = p_priority_end,
        updated_at = NOW()
    WHERE id = p_project_id
      AND household_id = v_household_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Project % not found in household %', p_project_id, v_household_id;
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_priority_project(uuid, date, date) TO authenticated;
