import React, { useState } from 'react';

export default function ImportProjectSheet({ open, onClose }) {
  const [jsonText, setJsonText] = useState('');

  if (!open) return null;

  return (
    <>
      <div
        data-testid="import-sheet-backdrop"
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
      />
      <div
        data-testid="import-sheet"
        className="fixed inset-x-0 bottom-0 z-[60] bg-white dark:bg-slate-900 rounded-t-3xl shadow-xl max-h-[90vh] flex flex-col sm:max-w-[480px] sm:mx-auto"
      >
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
        <div className="px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <h2
            className="text-lg font-bold text-slate-900 dark:text-slate-50"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Projekt importieren
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            JSON aus dem Planungs-Artifact einfügen
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <textarea
            data-testid="import-sheet-textarea"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder={'{\n  "project": {\n    ...\n  }\n}'}
            className="w-full min-h-[200px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 font-mono text-xs text-slate-900 dark:text-slate-50"
          />
        </div>
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex gap-3">
          <button
            data-testid="import-sheet-cancel"
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 font-medium"
          >
            Abbrechen
          </button>
          <button
            data-testid="import-sheet-validate"
            disabled={jsonText.trim().length === 0}
            // validation logic in M-4.3b
            onClick={() => {}}
            className="flex-1 rounded-xl bg-rose-500 text-white py-3 font-medium disabled:opacity-40"
          >
            Validieren
          </button>
        </div>
      </div>
    </>
  );
}
