import React from 'react';
import { computeProjectProgress } from '../../lib/projectProgress';

export default function ProjectRow({ project, clusters, microtasks }) {
  const { percent, hasNoTasks } = computeProjectProgress(project.id, clusters, microtasks);

  return (
    <div
      data-testid={`project-row-${project.id}`}
      className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4"
    >
      <h3
        className="text-base font-semibold text-slate-900 dark:text-slate-50"
        style={{ fontFamily: 'Manrope, sans-serif' }}
      >
        {project.name}
      </h3>
      {project.summary && (
        <p className="text-sm text-slate-600 dark:text-slate-400 truncate mt-0.5">
          {project.summary}
        </p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-rose-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 w-10 text-right">
          {hasNoTasks ? '—' : `${percent}%`}
        </span>
      </div>
    </div>
  );
}
