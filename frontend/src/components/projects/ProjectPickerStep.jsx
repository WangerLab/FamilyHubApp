import React from 'react';
import { FolderKanban } from 'lucide-react';
import { useProjects } from '../../contexts/ProjectsContext';
import { computeProjectProgress } from '../../lib/projectProgress';

export default function ProjectPickerStep({ onPick }) {
  const { projects, clusters, microtasks, loading } = useProjects();

  if (loading) {
    return (
      <div className="px-4 pt-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">Lade Projekte…</p>
      </div>
    );
  }

  const activeProjects = (projects || [])
    .filter((p) => !p.archived && !p.removed_at)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  if (activeProjects.length === 0) {
    return (
      <div className="px-4 pt-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Keine aktiven Projekte vorhanden. Lege erst ein Projekt im Plan-Modus an.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 space-y-2">
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
        Welches Projekt möchtest du reviewen?
      </p>
      {activeProjects.map((p) => {
        const { percent, hasNoTasks } = computeProjectProgress(
          p.id,
          clusters || [],
          microtasks || []
        );
        return (
          <button
            key={p.id}
            type="button"
            data-testid={`review-project-pick-${p.id}`}
            onClick={() => onPick(p)}
            className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-left active:opacity-70 flex items-start gap-3"
          >
            <FolderKanban className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate flex-1">
                  {p.name}
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  {hasNoTasks ? '—' : `${percent}%`}
                </span>
              </div>
              {p.summary && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 truncate">
                  {p.summary}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
