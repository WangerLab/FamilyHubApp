import React from 'react';

export default function ValidationFeedback({ state, errors, parsed }) {
  if (state === 'syntax_error') {
    return (
      <div
        data-testid="validation-feedback-syntax-error"
        className="mt-4 rounded-xl bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-900 p-4"
      >
        <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">JSON-Syntaxfehler</p>
        <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-mono break-words">
          {errors[0]}
        </p>
      </div>
    );
  }

  if (state === 'schema_error') {
    return (
      <div
        data-testid="validation-feedback-schema-error"
        className="mt-4 rounded-xl bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-900 p-4"
      >
        <p className="text-sm font-semibold text-rose-700 dark:text-rose-300 mb-2">
          Schema-Fehler ({errors.length})
        </p>
        <ul className="space-y-1 list-disc list-inside">
          {errors.map((err, i) => (
            <li key={i} className="text-xs text-rose-600 dark:text-rose-400 font-mono break-words">
              {err}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (state === 'valid' && parsed) {
    const microtaskCount = parsed.project.clusters.reduce(
      (s, c) => s + c.microtasks.length,
      0
    );
    return (
      <div
        data-testid="validation-feedback-valid"
        className="mt-4 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-900 p-4"
      >
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          Bereit zum Import
        </p>
        <p
          className="text-base font-bold text-slate-900 dark:text-slate-50 mt-2"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {parsed.project.name}
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          {parsed.project.clusters.length} Cluster · {microtaskCount} Aufgaben
        </p>
      </div>
    );
  }

  return null;
}
