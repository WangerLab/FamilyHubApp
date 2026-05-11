// Pure utilities for Projects JSON import/export. No React, no Supabase.

const SUGGESTED_FOR = ['tim', 'iris', 'both', null];
const COMPLETED_BY = ['tim', 'iris', null];
const isStr = (v) => typeof v === 'string';
const isNonEmptyStr = (v) => isStr(v) && v.trim().length > 0;
const isStrOrNull = (v) => v === null || isStr(v);
const isInt = (v) => Number.isInteger(v);
const isBool = (v) => typeof v === 'boolean';

export function validateProjectJson(json) {
  const errs = [];
  const p = json && typeof json === 'object' ? json.project : null;
  if (!p || typeof p !== 'object') return { valid: false, errors: ['project must be an object'] };
  if (!isNonEmptyStr(p.name)) errs.push('project.name must be a non-empty string');
  if (!isBool(p.priority)) errs.push('project.priority must be a boolean');
  const tf = p.priority_timeframe;
  if (!tf || typeof tf !== 'object') errs.push('project.priority_timeframe must be an object');
  else ['start', 'end'].forEach((k) => {
    if (!isStrOrNull(tf[k])) errs.push(`project.priority_timeframe.${k} must be string or null`);
  });
  if (!Array.isArray(p.clusters)) {
    errs.push('project.clusters must be an array');
    return { valid: false, errors: errs };
  }
  p.clusters.forEach((c, ci) => {
    const cp = `clusters[${ci}]`;
    if (!isNonEmptyStr(c.id)) errs.push(`${cp}.id must be a non-empty string`);
    if (!isNonEmptyStr(c.name)) errs.push(`${cp}.name must be a non-empty string`);
    if (!isStr(c.description)) errs.push(`${cp}.description must be a string`);
    if (!isInt(c.order)) errs.push(`${cp}.order must be an integer`);
    if (!Array.isArray(c.microtasks)) { errs.push(`${cp}.microtasks must be an array`); return; }
    const taskIds = new Set(c.microtasks.map((t) => t?.id).filter(isNonEmptyStr));
    c.microtasks.forEach((t, ti) => {
      const tp = `${cp}.microtasks[${ti}]`;
      if (!isNonEmptyStr(t.id)) errs.push(`${tp}.id must be a non-empty string`);
      if (!isNonEmptyStr(t.title)) errs.push(`${tp}.title must be a non-empty string`);
      if (!isStr(t.description)) errs.push(`${tp}.description must be a string`);
      if (!isInt(t.effort_weight) || t.effort_weight < 1 || t.effort_weight > 5) errs.push(`${tp}.effort_weight must be 1-5`);
      if (!Array.isArray(t.depends_on) || !t.depends_on.every(isStr)) errs.push(`${tp}.depends_on must be an array of strings`);
      else t.depends_on.forEach((dep, di) => {
        if (!taskIds.has(dep)) errs.push(`${tp}.depends_on[${di}] "${dep}" not found in same cluster`);
      });
      if (!SUGGESTED_FOR.includes(t.suggested_for)) errs.push(`${tp}.suggested_for must be tim|iris|both|null`);
      if (!isBool(t.completed)) errs.push(`${tp}.completed must be a boolean`);
      if (!COMPLETED_BY.includes(t.completed_by)) errs.push(`${tp}.completed_by must be tim|iris|null`);
      ['completed_at', 'note', 'note_details', 'note_raw'].forEach((k) => {
        if (!isStrOrNull(t[k])) errs.push(`${tp}.${k} must be string or null`);
      });
    });
  });
  return { valid: errs.length === 0, errors: errs };
}

export function jsonToDbShape(json, householdId, userId) {
  const p = json.project;
  const projectId = crypto.randomUUID();
  const project = {
    id: projectId,
    household_id: householdId,
    external_id: p.id ?? null,
    name: p.name,
    summary: p.summary ?? null,
    priority: p.priority,
    priority_start: p.priority_timeframe?.start ?? null,
    priority_end: p.priority_timeframe?.end ?? null,
    created_by: userId,
  };
  const clusters = [];
  const microtasks = [];
  (p.clusters || []).forEach((c) => {
    const clusterId = crypto.randomUUID();
    clusters.push({
      id: clusterId,
      project_id: projectId,
      external_id: c.id,
      name: c.name,
      description: c.description ?? '',
      cluster_order: c.order,
    });
    (c.microtasks || []).forEach((t, ti) => {
      const row = {
        id: crypto.randomUUID(),
        cluster_id: clusterId,
        external_id: t.id,
        title: t.title,
        description: t.description ?? '',
        effort_weight: t.effort_weight,
        depends_on: t.depends_on ?? [],
        suggested_for: t.suggested_for ?? null,
        task_order: ti,
        completed: !!t.completed,
        note: t.note ?? null,
        note_details: t.note_details ?? null,
        note_raw: t.note_raw ?? null,
      };
      if (t.completed) {
        row.completed_at = t.completed_at ?? null;
        row.completed_by = t.completed_by ?? null;
      }
      microtasks.push(row);
    });
  });
  return { project, clusters, microtasks };
}

export function dbShapeToJson(project, clusters, microtasks) {
  const activeClusters = (clusters || [])
    .filter((c) => !c.removed_at && !c.archived && c.project_id === project.id)
    .slice()
    .sort((a, b) => (a.cluster_order ?? 0) - (b.cluster_order ?? 0));
  const activeClusterIds = new Set(activeClusters.map((c) => c.id));
  const tasksByCluster = new Map();
  (microtasks || [])
    .filter((t) => !t.removed_at && !t.archived && activeClusterIds.has(t.cluster_id))
    .forEach((t) => {
      if (!tasksByCluster.has(t.cluster_id)) tasksByCluster.set(t.cluster_id, []);
      tasksByCluster.get(t.cluster_id).push(t);
    });
  tasksByCluster.forEach((arr) => arr.sort((a, b) => (a.task_order ?? 0) - (b.task_order ?? 0)));
  return {
    project: {
      id: project.external_id ?? project.id,
      name: project.name,
      summary: project.summary ?? '',
      priority: !!project.priority,
      priority_timeframe: { start: project.priority_start ?? null, end: project.priority_end ?? null },
      clusters: activeClusters.map((c) => ({
        id: c.external_id ?? c.id,
        name: c.name,
        description: c.description ?? '',
        order: c.cluster_order ?? 0,
        microtasks: (tasksByCluster.get(c.id) ?? []).map((t) => ({
          id: t.external_id ?? t.id,
          title: t.title,
          description: t.description ?? '',
          effort_weight: t.effort_weight,
          depends_on: t.depends_on ?? [],
          suggested_for: t.suggested_for ?? null,
          completed: !!t.completed,
          completed_by: t.completed_by ?? null,
          completed_at: t.completed_at ?? null,
          note: t.note ?? null,
          note_details: t.note_details ?? null,
          note_raw: t.note_raw ?? null,
        })),
      })),
    },
  };
}

export function mergeIntoExisting(newJson, existingDb, householdId, userId) {
  const p = newJson.project;
  const exClusters = existingDb.clusters || [];
  const exTasks = existingDb.microtasks || [];
  const clusterByExt = new Map(exClusters.filter((c) => c.external_id).map((c) => [c.external_id, c]));
  const tasksByClusterExt = new Map();
  exTasks.forEach((t) => {
    if (!t.external_id) return;
    if (!tasksByClusterExt.has(t.cluster_id)) tasksByClusterExt.set(t.cluster_id, new Map());
    tasksByClusterExt.get(t.cluster_id).set(t.external_id, t);
  });
  const seenC = new Set(), seenT = new Set();
  const toInsert = { clusters: [], microtasks: [] };
  const toUpdate = {
    project: {
      id: existingDb.project.id, name: p.name, summary: p.summary ?? null, priority: p.priority,
      priority_start: p.priority_timeframe?.start ?? null, priority_end: p.priority_timeframe?.end ?? null,
    },
    clusters: [], microtasks: [],
  };
  (p.clusters || []).forEach((c) => {
    const m = clusterByExt.get(c.id);
    const clusterId = m ? m.id : crypto.randomUUID();
    if (m) {
      seenC.add(m.id);
      toUpdate.clusters.push({ id: m.id, name: c.name, description: c.description ?? '', cluster_order: c.order });
    } else {
      toInsert.clusters.push({ id: clusterId, project_id: existingDb.project.id, external_id: c.id, name: c.name, description: c.description ?? '', cluster_order: c.order });
    }
    const exTasksMap = m ? (tasksByClusterExt.get(m.id) || new Map()) : new Map();
    (c.microtasks || []).forEach((t, ti) => {
      const tm = exTasksMap.get(t.id);
      const f = { title: t.title, description: t.description ?? '', effort_weight: t.effort_weight, depends_on: t.depends_on ?? [], suggested_for: t.suggested_for ?? null, task_order: ti };
      if (tm) { seenT.add(tm.id); toUpdate.microtasks.push({ id: tm.id, ...f }); }
      else toInsert.microtasks.push({ id: crypto.randomUUID(), cluster_id: clusterId, external_id: t.id, ...f });
    });
  });
  return {
    toInsert, toUpdate,
    toLeaveAlone: {
      clusters: exClusters.filter((c) => !seenC.has(c.id)).map((c) => c.id),
      microtasks: exTasks.filter((t) => !seenT.has(t.id)).map((t) => t.id),
    },
  };
}
