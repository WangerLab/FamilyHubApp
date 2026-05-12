import React from 'react';
import { Loader2, AlertCircle, RotateCw } from 'lucide-react';

/**
 * Phase 3 of plan-mode flow: AI structures the project.
 * Status-only display — either loader or error+retry. No user input;
 * parent triggers the API call via useEffect on phase entry.
 *
 * Props:
 * - loading: boolean
 * - error: string
 * - onRetry: () => void
 */
export default function StructuringStep({ loading, error, onRetry }) {
  if (!loading && !error) return null;

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
      {loading && !error && (
        <>
          <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
          <p
            className="text-base font-semibold text-slate-900 dark:text-slate-50"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            KI strukturiert dein Projekt…
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Das kann 10-30 Sekunden dauern.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs">
            Im Hintergrund werden Cluster und Aufgaben gegliedert und gewichtet.
          </p>
        </>
      )}
      {error && (
        <>
          <AlertCircle className="w-10 h-10 text-rose-500" />
          <p
            className="text-base font-semibold text-slate-900 dark:text-slate-50"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Etwas ist schief gelaufen
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 rounded-xl bg-rose-500 text-white py-2.5 px-5 text-sm font-semibold active:opacity-70 flex items-center gap-2"
          >
            <RotateCw className="w-4 h-4" />
            Erneut versuchen
          </button>
        </>
      )}
    </div>
  );
}
