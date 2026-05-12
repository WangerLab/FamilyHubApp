import React from 'react';
import { useProjects } from '../../contexts/ProjectsContext';
import { computeProjectProgress } from '../../lib/projectProgress';
import { getNextUnblockedTasks } from '../../lib/projectNextUp';

const DOT_COLORS = {
  tim: '#EC4899',
  iris: '#2563EB',
  both: '#94A3B8',
};

/**
 * Inner content for the Dashboard Projects tile.
 * Rendered as children of the generic <Tile> wrapper in DashboardHome.
 * Shows the most-recently-updated active project, its weighted progress,
 * and up to 2 next unblocked microtasks with suggested_for color dots.
 */
export default function ProjectsTile() {
  const { projects, clusters, microtasks, loading } = useProjects() || {};

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-xs text-slate-400 dark:text-slate-500">Lädt…</span>
      </div>
    );
  }

  const activeProjects = projects || [];
  if (activeProjects.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-sm text-slate-400 dark:text-slate-500 italic">
          Keine Projekte
        </span>
      </div>
    );
  }

  // projects is already sorted by updated_at DESC in ProjectsContext
  const project = activeProjects[0];
  const { percent, hasNoTasks } = computeProjectProgress(project.id, clusters || [], microtasks || []);
  const nextTasks = getNextUnblockedTasks(project.id, clusters || [], microtasks || [], 2);

  return (
    <div className="flex-1 flex flex-col gap-1.5 min-w-0">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
        {project.name}
      </p>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-rose-500" style={{ width: `${percent}%` }} />
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums w-9 text-right">
          {hasNoTasks ? '—' : `${percent}%`}
        </span>
      </div>

      {nextTasks.length > 0 ? (
        <div className="flex flex-col gap-0.5 mt-0.5 min-w-0">
          {nextTasks.map((t) => (
            <div key={t.id} className="flex items-center gap-1.5 min-w-0">
              {DOT_COLORS[t.suggested_for] && (
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: DOT_COLORS[t.suggested_for] }}
                  aria-hidden="true"
                />
              )}
              <span className="text-xs text-slate-700 dark:text-slate-200 truncate">
                {t.title}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">
          Alles erledigt
        </p>
      )}
    </div>
  );
}
