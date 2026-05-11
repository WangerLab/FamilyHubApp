/**
 * Returns the list of microtasks that block the given task from being
 * completed. A task is "blocked" if any of its depends_on entries refers
 * to a microtask that is not yet completed (and is not archived/removed).
 *
 * @param {Object} task - the microtask to check
 * @param {Array} allMicrotasks - all microtasks from useProjects()
 * @returns {Array} blocking microtask objects (may be empty)
 */
export function getBlockingTasks(task, allMicrotasks) {
  if (!task || !Array.isArray(task.depends_on) || task.depends_on.length === 0) {
    return [];
  }
  // depends_on holds external_id strings — match against microtask.external_id
  const blocking = [];
  for (const externalId of task.depends_on) {
    if (!externalId) continue;
    const prereq = allMicrotasks.find(
      m => m.external_id === externalId && !m.archived && !m.removed_at
    );
    if (prereq && !prereq.completed) {
      blocking.push(prereq);
    }
    // If prereq not found (deleted/archived) we treat the dependency as
    // resolved — the task is not blocked by something that doesn't exist
    // anymore. This is intentional to avoid permanent deadlocks.
  }
  return blocking;
}
