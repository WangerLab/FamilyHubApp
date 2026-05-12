import React from 'react';
import { Check, Plus, Edit3, ArrowRight, Archive, Tag } from 'lucide-react';
import { getSuggestionLabel } from '../../lib/reviewSuggestions';

const ICONS = {
  add_microtask: Plus,
  rename_microtask: Edit3,
  move_microtask: ArrowRight,
  supersede_microtask: Archive,
  rename_cluster: Tag,
};

const SUGGESTED_FOR_LABEL = {
  tim: 'Tim',
  iris: 'Iris',
  both: 'beide',
};

function findMicrotaskTitle(microtaskId, microtasks) {
  const m = (microtasks || []).find((x) => x.id === microtaskId);
  return m?.title || '(unbekannte Aufgabe)';
}

function findClusterName(clusterId, clusters) {
  const c = (clusters || []).find((x) => x.id === clusterId);
  return c?.name || '(unbekannter Cluster)';
}

function renderBody(s, clusters, microtasks) {
  if (s.type === 'add_microtask') {
    return (
      <>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{s.title}</p>
        {s.description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{s.description}</p>
        )}
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
          in Cluster „{findClusterName(s.cluster_id, clusters)}"
          {s.suggested_for && SUGGESTED_FOR_LABEL[s.suggested_for]
            ? ` · für ${SUGGESTED_FOR_LABEL[s.suggested_for]}`
            : ''}
          {` · Effort ${s.effort_weight}`}
        </p>
      </>
    );
  }
  if (s.type === 'rename_microtask') {
    const oldTitle = findMicrotaskTitle(s.microtask_id, microtasks);
    return (
      <>
        <p className="text-xs text-slate-500 dark:text-slate-400 line-through">{oldTitle}</p>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{s.title}</p>
        {s.description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{s.description}</p>
        )}
      </>
    );
  }
  if (s.type === 'move_microtask') {
    return (
      <>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
          {findMicrotaskTitle(s.microtask_id, microtasks)}
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
          → nach „{findClusterName(s.new_cluster_id, clusters)}"
        </p>
      </>
    );
  }
  if (s.type === 'supersede_microtask') {
    return (
      <p className="text-sm font-medium text-slate-900 dark:text-slate-50 line-through italic">
        {findMicrotaskTitle(s.microtask_id, microtasks)}
      </p>
    );
  }
  if (s.type === 'rename_cluster') {
    const oldName = findClusterName(s.cluster_id, clusters);
    return (
      <>
        <p className="text-xs text-slate-500 dark:text-slate-400 line-through">{oldName}</p>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{s.name}</p>
        {s.description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{s.description}</p>
        )}
      </>
    );
  }
  return null;
}

export default function SuggestionCard({ suggestion, accepted, onToggle, clusters, microtasks }) {
  const Icon = ICONS[suggestion.type] || Plus;
  return (
    <button
      type="button"
      data-testid={`suggestion-card-${suggestion.type}`}
      onClick={onToggle}
      className={`w-full text-left rounded-xl border p-3 active:opacity-70 transition-colors ${
        accepted
          ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
            accepted
              ? 'bg-rose-500 border-rose-500'
              : 'border-slate-300 dark:border-slate-600 bg-transparent'
          }`}
          aria-hidden="true"
        >
          {accepted && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Icon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
            <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
              {getSuggestionLabel(suggestion.type)}
            </p>
          </div>
          {renderBody(suggestion, clusters, microtasks)}
          {suggestion.reason && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 italic">
              {suggestion.reason}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
