// Pure Validation + Filter Helpers für Review-Modus-Vorschläge.
// API liefert bereits server-side validierte Vorschläge — diese Funktionen
// machen zusätzliche Client-Side-Sanity-Checks gegen den aktuellen DB-State
// (z.B. existieren referenzierte microtask_id/cluster_id noch?).

export const SUGGESTION_TYPE_LABELS = {
  add_microtask: 'Neue Aufgabe',
  rename_microtask: 'Aufgabe umbenennen',
  move_microtask: 'Aufgabe verschieben',
  supersede_microtask: 'Als nicht mehr relevant markieren',
  rename_cluster: 'Cluster umbenennen',
};

export function getSuggestionLabel(type) {
  return SUGGESTION_TYPE_LABELS[type] || type;
}

/**
 * Filtert Vorschläge, deren referenzierte IDs nicht im aktuellen DB-State
 * existieren. Solche Vorschläge sind „stale" — z.B. weil Iris parallel
 * den referenzierten Task gelöscht hat während Tim im Review-Flow war.
 *
 * Returns { valid: [...], stale: [...] } — UI kann staleSuggestions optional
 * dem User zeigen ("3 Vorschläge übersprungen, weil sich was geändert hat").
 */
export function filterStaleSuggestions(suggestions, clusters, microtasks, projectId) {
  const projectClusterIds = new Set(
    (clusters || [])
      .filter(c => c.project_id === projectId && !c.removed_at)
      .map(c => c.id)
  );
  const projectMicrotaskIds = new Set(
    (microtasks || [])
      .filter(m => projectClusterIds.has(m.cluster_id) && !m.removed_at)
      .map(m => m.id)
  );

  const valid = [];
  const stale = [];

  for (const s of suggestions || []) {
    if (s.type === 'add_microtask') {
      if (projectClusterIds.has(s.cluster_id)) valid.push(s); else stale.push(s);
    } else if (s.type === 'rename_cluster') {
      if (projectClusterIds.has(s.cluster_id)) valid.push(s); else stale.push(s);
    } else if (s.type === 'rename_microtask' || s.type === 'supersede_microtask') {
      if (projectMicrotaskIds.has(s.microtask_id)) valid.push(s); else stale.push(s);
    } else if (s.type === 'move_microtask') {
      if (projectMicrotaskIds.has(s.microtask_id) && projectClusterIds.has(s.new_cluster_id)) {
        valid.push(s);
      } else {
        stale.push(s);
      }
    } else {
      stale.push(s);
    }
  }

  return { valid, stale };
}

/**
 * Verteilt eine Vorschlag-Liste auf einen Index nach type, für UI-Gruppierung
 * im SuggestionsReviewStep.
 */
export function groupSuggestionsByType(suggestions) {
  const groups = {
    add_microtask: [],
    rename_microtask: [],
    move_microtask: [],
    supersede_microtask: [],
    rename_cluster: [],
  };
  for (const s of suggestions || []) {
    if (groups[s.type]) groups[s.type].push(s);
  }
  return groups;
}

/**
 * Stable ID-Generator für UI-Tracking (welche Vorschläge sind angehakt?).
 * Vorschläge selbst haben keine ID, also generieren wir eine aus Position + type.
 */
export function suggestionKey(suggestion, index) {
  return `${index}_${suggestion.type}`;
}
