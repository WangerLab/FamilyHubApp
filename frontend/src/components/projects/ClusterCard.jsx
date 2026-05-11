import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { computeClusterProgress } from '../../lib/projectProgress';

export default function ClusterCard({ cluster, microtasks }) {
  const [expanded, setExpanded] = useState(true);
  const { percent, hasNoTasks } = computeClusterProgress(cluster.id, microtasks);

  return (
    <div
      data-testid={`cluster-card-${cluster.id}`}
      className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden"
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-4 active:opacity-80"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="w-5 h-5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
        )}
        <div className="flex-1 text-left min-w-0">
          <h3
            className="text-base font-semibold text-slate-900 dark:text-slate-50 truncate"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            {cluster.name}
          </h3>
          {cluster.description && (
            <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
              {cluster.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
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
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-800 pt-3">
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">
            Aufgaben kommen in M-4.4c
          </p>
        </div>
      )}
    </div>
  );
}
