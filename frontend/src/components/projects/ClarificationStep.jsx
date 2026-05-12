import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Phase 2 of plan-mode flow: clarifying questions from AI.
 * Renders all previous rounds readonly + the current round with
 * per-question textareas. Parent owns the rounds state and the
 * API call on submit.
 *
 * Props:
 * - rounds: Array<{ questions: string[], answers: string[] }>
 * - onAnswerChange: (roundIndex, questionIndex, value) => void
 * - onSubmit: () => void
 * - loading: boolean
 * - error: string
 * - isLastRound: boolean — true if this is the 2nd (and final) round
 */
export default function ClarificationStep({ rounds, onAnswerChange, onSubmit, loading, error, isLastRound }) {
  const lastIndex = rounds.length - 1;
  const currentRound = rounds[lastIndex];
  const previousRounds = rounds.slice(0, lastIndex);

  const hasAnyAnswer = currentRound?.answers?.some((a) => a.trim()) || false;
  const submitDisabled = loading || !hasAnyAnswer;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Ein paar Klarifikationen helfen, dein Projekt besser zu strukturieren.
      </p>

      {previousRounds.length > 0 && (
        <div className="space-y-3">
          {previousRounds.map((round, ri) => (
            <div key={ri} className="rounded-xl bg-slate-100 dark:bg-slate-900 p-3 space-y-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Runde {ri + 1}
              </p>
              {round.questions.map((q, qi) => (
                <div key={qi} className="space-y-0.5">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{q}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    {round.answers[qi]?.trim() || '(keine Antwort)'}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {currentRound?.questions.map((q, qi) => (
          <div key={qi} className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
              {q}
            </label>
            <textarea
              value={currentRound.answers[qi] || ''}
              onChange={(e) => onAnswerChange(lastIndex, qi, e.target.value)}
              rows={2}
              disabled={loading}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 resize-none disabled:opacity-50"
              placeholder="Antwort eingeben (optional)…"
            />
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
        onClick={onSubmit}
        disabled={submitDisabled}
        className="w-full rounded-xl bg-rose-500 text-white py-3 text-sm font-semibold active:opacity-70 disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" />KI denkt nach…</>
        ) : (
          <>{isLastRound ? 'Weiter strukturieren' : 'Weiter'}</>
        )}
      </button>
    </div>
  );
}
