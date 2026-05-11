import React from 'react';
import { Check } from 'lucide-react';

/**
 * Toggle-List for selecting dependencies of a microtask.
 * Fully controlled — parent owns selectedExternalIds and handles the
 * onToggle event by updating the underlying microtask.
 *
 * Props:
 * - selectableTasks: Array — microtasks that can be selected as dependency.
 *   Each must have at least { id, title, external_id }.
 * - selectedExternalIds: string[] — currently-selected external_ids
 * - onToggle: (externalId: string) => void — fired on each tap
 * - emptyMessage?: string — shown when selectableTasks is empty
 */
export default function DependencyToggleList({
  selectableTasks,
  selectedExternalIds,
  onToggle,
  emptyMessage = 'Keine anderen Aufgaben in diesem Cluster',
}) {
  if (!selectableTasks || selectableTasks.length === 0) {
    return (
      <p className="text-sm text-slate-400 dark:text-slate-500 italic">
        {emptyMessage}
      </p>
    );
  }

  const selectedSet = new Set(selectedExternalIds || []);

  return (
    <div className="space-y-1">
      {selectableTasks.map(t => {
        const isDep = selectedSet.has(t.external_id);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onToggle(t.external_id)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg active:opacity-70 hover:bg-slate-50 dark:hover:bg-slate-800"
            aria-pressed={isDep}
          >
            <div
              className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                isDep
                  ? 'bg-rose-500 border-rose-500'
                  : 'border-slate-300 dark:border-slate-600'
              }`}
            >
              {isDep && (
                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
              )}
            </div>
            <span className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1 text-left">
              {t.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}
