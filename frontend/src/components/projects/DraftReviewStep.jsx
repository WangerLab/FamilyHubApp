import React from 'react';
import { Trash2, Loader2 } from 'lucide-react';

const SUGGESTED_COLORS = {
  tim: '#EC4899',
  iris: '#2563EB',
  both: '#94A3B8',
};
const SUGGESTED_LABELS = {
  tim: 'Tim',
  iris: 'Iris',
  both: 'Beide',
};

/**
 * Phase 4 of plan-mode flow: review the AI-structured draft.
 * Renders project name + clusters + microtasks with inline trash
 * icons for removal. Parent owns the draft state and the accept
 * action (real bulk insert wired in commit 8).
 *
 * Props:
 * - draft: { name, summary, clusters: [...] }
 * - onRemoveTask: (clusterId, taskId) => void
 * - onRemoveCluster: (clusterId) => void
 * - onAccept: () => void
 * - accepting: boolean
 * - error: string — shown above the submit button when accept fails
 */
export default function DraftReviewStep({ draft, onRemoveTask, onRemoveCluster, onAccept, accepting, error }) {
  if (!draft) return null;
  const totalTasks = draft.clusters.reduce((s, c) => s + c.microtasks.length, 0);
  const submitDisabled = accepting || draft.clusters.length === 0 || totalTasks === 0;

  return (
    <div className="space-y-4">
      <div>
        <h2
          className="text-lg font-bold text-slate-900 dark:text-slate-50"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {draft.name}
        </h2>
        {draft.summary && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{draft.summary}</p>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
          {draft.clusters.length} Cluster · {totalTasks} Aufgaben
        </p>
      </div>

      <div className="rounded-xl bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-900 p-3">
        <p className="text-xs text-rose-700 dark:text-rose-300">
          Du kannst Cluster und Aufgaben hier streichen. Weitere Anpassungen (Effort, Personen) machst du nach dem Erstellen in der Projektübersicht.
        </p>
      </div>

      <div className="space-y-3">
        {draft.clusters.map((cluster) => (
          <div
            key={cluster.id}
            className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4"
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <h3
                  className="text-base font-semibold text-slate-900 dark:text-slate-50"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  {cluster.name}
                </h3>
                {cluster.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cluster.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRemoveCluster(cluster.id)}
                className="p-1.5 rounded-lg active:opacity-70 flex-shrink-0"
                aria-label={`Cluster ${cluster.name} streichen`}
              >
                <Trash2 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {cluster.microtasks.length === 0 ? (
                <p className="text-xs italic text-slate-400 dark:text-slate-500">Keine Aufgaben mehr</p>
              ) : (
                cluster.microtasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-2 py-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {task.suggested_for && SUGGESTED_LABELS[task.suggested_for] && (
                          <span
                            className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full text-white font-medium"
                            style={{ backgroundColor: SUGGESTED_COLORS[task.suggested_for] }}
                          >
                            {SUGGESTED_LABELS[task.suggested_for]}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          Aufwand: {task.effort_weight}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveTask(cluster.id, task.id)}
                      className="p-1.5 rounded-lg active:opacity-70 flex-shrink-0"
                      aria-label={`${task.title} streichen`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-900 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={onAccept}
        disabled={submitDisabled}
        className="w-full rounded-xl bg-rose-500 text-white py-3 text-sm font-semibold active:opacity-70 disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {accepting ? (
          <><Loader2 className="w-4 h-4 animate-spin" />Wird erstellt…</>
        ) : (
          <>Projekt erstellen ({draft.clusters.length} Cluster, {totalTasks} Aufgaben)</>
        )}
      </button>
    </div>
  );
}
