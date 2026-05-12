import React, { useState, useMemo } from 'react';
import { Sparkles } from 'lucide-react';

const MAX_LEN = 5000;

export default function ContextDumpStep({ project, clusters, microtasks, onSubmit, submitting, errorMessage }) {
  const [text, setText] = useState('');

  const projectClusters = useMemo(
    () => (clusters || [])
      .filter((c) => c.project_id === project.id && !c.archived && !c.removed_at)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [clusters, project.id]
  );

  const stats = useMemo(() => {
    let total = 0;
    let done = 0;
    let superseded = 0;
    const clusterIds = new Set(projectClusters.map((c) => c.id));
    for (const m of microtasks || []) {
      if (!clusterIds.has(m.cluster_id)) continue;
      if (m.removed_at || m.archived) continue;
      total += 1;
      if (m.superseded_at) superseded += 1;
      else if (m.completed) done += 1;
    }
    return { total, done, superseded, open: total - done - superseded };
  }, [projectClusters, microtasks]);

  const canSubmit = text.trim().length > 0 && text.length <= MAX_LEN && !submitting;

  return (
    <div className="px-4 pt-4 space-y-4">
      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-3">
        <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
          Aktueller Stand
        </p>
        <p className="text-sm text-slate-700 dark:text-slate-200 mt-1">
          {projectClusters.length} Cluster · {stats.done} erledigt · {stats.open} offen
          {stats.superseded > 0 ? ` · ${stats.superseded} archiviert` : ''}
        </p>
      </div>

      <div>
        <label
          htmlFor="review-context-dump"
          className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2"
        >
          Was hat sich geändert? Was ist passiert?
        </label>
        <textarea
          id="review-context-dump"
          data-testid="review-context-dump"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          maxLength={MAX_LEN}
          placeholder="Beschreibe Änderungen oder neue Erkenntnisse — die KI generiert daraus Vorschläge unter Berücksichtigung des aktuellen Stands."
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500"
        />
        <div className="flex justify-end mt-1">
          <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
            {text.length} / {MAX_LEN}
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2">
          <p className="text-xs text-red-700 dark:text-red-300">{errorMessage}</p>
        </div>
      )}

      <button
        type="button"
        data-testid="review-submit-button"
        onClick={() => onSubmit(text.trim())}
        disabled={!canSubmit}
        className="w-full rounded-xl bg-rose-500 text-white py-3 font-semibold active:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        {submitting ? 'KI denkt nach…' : 'Vorschläge holen'}
      </button>
    </div>
  );
}
