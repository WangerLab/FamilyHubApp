// Baut den Composite-Text für API-Mode "project_review":
// 1) Projekt-Stand strukturiert (Cluster + Microtasks mit IDs, Status, Notes)
// 2) Trennzeile
// 3) User-Context-Dump
//
// Der API-Prompt erwartet beides in einem einzigen "text"-Feld.
// IDs müssen im Klartext vorkommen, damit das Modell sie in den
// suggestions korrekt referenzieren kann.

const SUGGESTED_FOR_LABEL = {
  tim: 'Tim',
  iris: 'Iris',
  both: 'beide',
};

function formatMicrotask(m) {
  const parts = [`  - [${m.id}] "${m.title}"`];
  if (m.completed) parts.push('(erledigt)');
  if (m.superseded_at) parts.push('(superseded)');
  if (m.suggested_for && SUGGESTED_FOR_LABEL[m.suggested_for]) {
    parts.push(`für ${SUGGESTED_FOR_LABEL[m.suggested_for]}`);
  }
  if (typeof m.effort_weight === 'number') {
    parts.push(`Effort ${m.effort_weight}`);
  }
  let line = parts.join(' ');
  if (m.description) {
    line += `\n      Beschreibung: ${m.description}`;
  }
  if (m.note) {
    line += `\n      Notiz: ${m.note}`;
  }
  return line;
}

export function buildReviewContext(project, clusters, microtasks, userText) {
  const projectClusters = (clusters || [])
    .filter((c) => c.project_id === project.id && !c.archived && !c.removed_at)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const lines = [];
  lines.push(`PROJEKT: ${project.name}`);
  if (project.summary) lines.push(`Zusammenfassung: ${project.summary}`);
  lines.push('');
  lines.push('AKTUELLE STRUKTUR:');

  for (const c of projectClusters) {
    lines.push(`Cluster [${c.id}] "${c.name}"`);
    if (c.description) lines.push(`  Beschreibung: ${c.description}`);
    const tasksForCluster = (microtasks || [])
      .filter((m) => m.cluster_id === c.id && !m.archived && !m.removed_at)
      .sort((a, b) => (a.task_order ?? 0) - (b.task_order ?? 0));
    if (tasksForCluster.length === 0) {
      lines.push('  (keine Aufgaben)');
    } else {
      for (const m of tasksForCluster) {
        lines.push(formatMicrotask(m));
      }
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('CONTEXT-DUMP VOM USER:');
  lines.push(userText || '(leer)');

  return lines.join('\n');
}
