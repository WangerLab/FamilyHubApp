import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

const MAX_LEN = 5000;

/**
 * Phase 1 of plan-mode flow: free-form brain dump input.
 * Dumb UI — controlled textarea + submit button. Parent handles
 * loading state, errors, and the API call on submit.
 *
 * Props:
 * - value: string
 * - onChange: (text: string) => void
 * - onSubmit: () => void
 * - loading: boolean
 * - error: string
 */
export default function BrainDumpStep({ value, onChange, onSubmit, loading, error }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

  const overLimit = value.length > MAX_LEN;
  const submitDisabled = !value.trim() || loading || overLimit;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Beschreibe das Projekt — Ziel, Inhalte, wer mitmacht, Zeitfenster. Die KI strukturiert es danach.
      </p>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        disabled={loading}
        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 resize-none disabled:opacity-50"
        placeholder="z.B. Gartenarbeit für die Frühjahrssaison. Beet umgraben, Hecken schneiden, neue Bepflanzung. Material müssen wir noch einkaufen."
      />
      <p className={`text-xs text-right ${overLimit ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
        {value.length} / {MAX_LEN}
      </p>
      {error && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-900 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitDisabled}
        className="w-full rounded-xl bg-rose-500 text-white py-3 text-sm font-semibold active:opacity-70 disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" />KI denkt nach…</>
        ) : (
          <>Weiter</>
        )}
      </button>
    </div>
  );
}
