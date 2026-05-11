/**
 * Compute weighted progress percent for a project.
 * Counts only active (non-archived, non-removed) clusters and microtasks.
 *
 * @param {string} projectId
 * @param {Array} clusters - all clusters from useProjects()
 * @param {Array} microtasks - all microtasks from useProjects()
 * @returns {{ percent: number, hasNoTasks: boolean }}
 */
export function computeProjectProgress(projectId, clusters, microtasks) {
  const projectClusterIds = clusters
    .filter(c => c.project_id === projectId && !c.archived && !c.removed_at)
    .map(c => c.id);
  const relevantTasks = microtasks.filter(
    m => projectClusterIds.includes(m.cluster_id) && !m.archived && !m.removed_at
  );
  if (relevantTasks.length === 0) return { percent: 0, hasNoTasks: true };
  const totalWeight = relevantTasks.reduce((s, t) => s + (t.effort_weight || 1), 0);
  const doneWeight = relevantTasks
    .filter(t => t.completed)
    .reduce((s, t) => s + (t.effort_weight || 1), 0);
  return {
    percent: totalWeight === 0 ? 0 : Math.round((doneWeight / totalWeight) * 100),
    hasNoTasks: false,
  };
}

/**
 * Compute weighted progress percent for a single cluster.
 * Counts only active (non-archived, non-removed) microtasks.
 *
 * @param {string} clusterId
 * @param {Array} microtasks - all microtasks from useProjects()
 * @returns {{ percent: number, hasNoTasks: boolean }}
 */
export function computeClusterProgress(clusterId, microtasks) {
  const relevantTasks = microtasks.filter(
    m => m.cluster_id === clusterId && !m.archived && !m.removed_at
  );
  if (relevantTasks.length === 0) return { percent: 0, hasNoTasks: true };
  const totalWeight = relevantTasks.reduce((s, t) => s + (t.effort_weight || 1), 0);
  const doneWeight = relevantTasks
    .filter(t => t.completed)
    .reduce((s, t) => s + (t.effort_weight || 1), 0);
  return {
    percent: totalWeight === 0 ? 0 : Math.round((doneWeight / totalWeight) * 100),
    hasNoTasks: false,
  };
}
