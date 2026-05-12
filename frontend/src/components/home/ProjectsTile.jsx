import React from 'react';
import { useProjects } from '../../contexts/ProjectsContext';
import { computeProjectProgress } from '../../lib/projectProgress';

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

  const priorityProject = activeProjects.find(p => p.priority);
  const { percent, hasNoTasks } = priorityProject
    ? computeProjectProgress(priorityProject.id, clusters || [], microtasks || [])
    : { percent: 0, hasNoTasks: true };

  return (
    <div className="flex-1 flex flex-col justify-between min-w-0">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-base font-bold tabular-nums border-[1.5px] border-rose-500 text-rose-600 dark:text-rose-400">
          {activeProjects.length}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {activeProjects.length === 1 ? 'Projekt' : 'Projekte'}
        </span>
      </div>

      {priorityProject && (
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-rose-500 font-semibold">
            Prio
          </p>
          <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
            {priorityProject.name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-rose-500" style={{ width: `${percent}%` }} />
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums w-9 text-right">
              {hasNoTasks ? '—' : `${percent}%`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
