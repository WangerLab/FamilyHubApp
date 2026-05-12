-- Sprint M-8: RPC apply_review_suggestions
-- Atomare Transaktion für Review-Modus-Vorschläge.
-- Unterstützt: add_microtask, rename_microtask, move_microtask,
--              supersede_microtask, rename_cluster
-- SECURITY DEFINER + search_path=public für RLS-Bypass mit Household-Check.

CREATE OR REPLACE FUNCTION public.apply_review_suggestions(
  p_project_id uuid,
  p_suggestions jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_household_id uuid;
  v_project_household uuid;
  v_suggestion jsonb;
  v_type text;
  v_microtask_id uuid;
  v_cluster_id uuid;
  v_new_cluster_project uuid;
  v_is_completed boolean;
  v_applied int := 0;
BEGIN
  v_household_id := get_my_household_id();
  IF v_household_id IS NULL THEN
    RAISE EXCEPTION 'No household';
  END IF;

  SELECT household_id INTO v_project_household
  FROM projects WHERE id = p_project_id;

  IF v_project_household IS NULL OR v_project_household <> v_household_id THEN
    RAISE EXCEPTION 'Project not in household';
  END IF;

  FOR v_suggestion IN SELECT * FROM jsonb_array_elements(p_suggestions)
  LOOP
    v_type := v_suggestion->>'type';

    IF v_type = 'add_microtask' THEN
      v_cluster_id := (v_suggestion->>'cluster_id')::uuid;
      INSERT INTO project_microtasks (
        cluster_id, title, description, effort_weight,
        suggested_for, depends_on, completed
      ) VALUES (
        v_cluster_id,
        v_suggestion->>'title',
        v_suggestion->>'description',
        COALESCE((v_suggestion->>'effort_weight')::int, 2),
        v_suggestion->>'suggested_for',
        COALESCE(v_suggestion->'depends_on', '[]'::jsonb),
        false
      );

    ELSIF v_type = 'rename_microtask' THEN
      v_microtask_id := (v_suggestion->>'microtask_id')::uuid;
      SELECT completed INTO v_is_completed
      FROM project_microtasks WHERE id = v_microtask_id;
      IF v_is_completed THEN
        RAISE EXCEPTION 'Cannot rename completed microtask %', v_microtask_id;
      END IF;
      UPDATE project_microtasks
      SET title = v_suggestion->>'title',
          description = v_suggestion->>'description',
          updated_at = NOW()
      WHERE id = v_microtask_id;

    ELSIF v_type = 'move_microtask' THEN
      v_microtask_id := (v_suggestion->>'microtask_id')::uuid;
      v_cluster_id := (v_suggestion->>'new_cluster_id')::uuid;
      SELECT project_id INTO v_new_cluster_project
      FROM project_clusters WHERE id = v_cluster_id;
      IF v_new_cluster_project <> p_project_id THEN
        RAISE EXCEPTION 'Target cluster % not in project %', v_cluster_id, p_project_id;
      END IF;
      UPDATE project_microtasks
      SET cluster_id = v_cluster_id, updated_at = NOW()
      WHERE id = v_microtask_id;

    ELSIF v_type = 'supersede_microtask' THEN
      v_microtask_id := (v_suggestion->>'microtask_id')::uuid;
      UPDATE project_microtasks
      SET superseded_at = NOW(),
          superseded_reason = v_suggestion->>'reason',
          updated_at = NOW()
      WHERE id = v_microtask_id;

    ELSIF v_type = 'rename_cluster' THEN
      v_cluster_id := (v_suggestion->>'cluster_id')::uuid;
      UPDATE project_clusters
      SET name = v_suggestion->>'name',
          description = v_suggestion->>'description',
          updated_at = NOW()
      WHERE id = v_cluster_id AND project_id = p_project_id;

    ELSE
      RAISE EXCEPTION 'Unknown suggestion type: %', v_type;
    END IF;

    v_applied := v_applied + 1;
  END LOOP;

  UPDATE projects SET updated_at = NOW() WHERE id = p_project_id;

  RETURN jsonb_build_object('applied', v_applied);
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_review_suggestions(uuid, jsonb) TO authenticated;
