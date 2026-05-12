import { getBlockingTasks } from './projectDependencies';

/**
 * Returns the next N unblocked, incomplete microtasks for a given project.
 * "Unblocked" means: no incomplete prerequisite via depends_on.
 * Tasks are sorted by cluster_order, then task_order (same as project detail view).
 *
 * @param {string} projectId
 * @param {Array} clusters - all clusters from useProjects()
 * @param {Array} microtasks - all microtasks from useProjects()
 * @param {number} limit - max number of tasks to return (default 2)
 * @returns {Array} microtask objects (may be empty)
 */
export function getNextUnblockedTasks(projectId, clusters, microtasks, limit = 2) {
  // 1. Find active clusters of this project, sorted by cluster_order
  const projectClusters = clusters
    .filter(c => c.project_id === projectId && !c.archived && !c.removed_at)
    .sort((a, b) => (a.cluster_order ?? 0) - (b.cluster_order ?? 0));
  const clusterOrderMap = new Map(projectClusters.map((c, idx) => [c.id, idx]));

  // 2. Collect active, incomplete microtasks in those clusters
  const candidates = microtasks.filter(
    m => clusterOrderMap.has(m.cluster_id)
      && !m.archived
      && !m.removed_at
      && !m.completed
  );

  // 3. Sort by (cluster_order, task_order)
  candidates.sort((a, b) => {
    const cDiff = clusterOrderMap.get(a.cluster_id) - clusterOrderMap.get(b.cluster_id);
    if (cDiff !== 0) return cDiff;
    return (a.task_order ?? 0) - (b.task_order ?? 0);
  });

  // 4. Filter out blocked ones (using same logic as MicrotaskRow)
  const unblocked = candidates.filter(t => getBlockingTasks(t, microtasks).length === 0);

  return unblocked.slice(0, limit);
}
