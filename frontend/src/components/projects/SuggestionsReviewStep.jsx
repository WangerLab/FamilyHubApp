import React, { useState, useMemo } from 'react';
import { Check } from 'lucide-react';
import { suggestionKey } from '../../lib/reviewSuggestions';
import SuggestionCard from './SuggestionCard';

export default function SuggestionsReviewStep({
  suggestions,
  staleCount,
  clusters,
  microtasks,
  onApply,
  applying,
  errorMessage,
}) {
  // Default: alle Vorschläge angehakt (Konzept-Vorgabe)
  const [accepted, setAccepted] = useState(() => {
    const init = {};
    (suggestions || []).forEach((s, i) => {
      init[suggestionKey(s, i)] = true;
    });
    return init;
  });

  const acceptedCount = useMemo(
    () => Object.values(accepted).filter(Boolean).length,
    [accepted]
  );

  const toggle = (key) => {
    setAccepted((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleApply = () => {
    const selected = (suggestions || []).filter((s, i) => accepted[suggestionKey(s, i)]);
    onApply(selected);
  };

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="px-4 pt-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Keine Vorschläge erhalten.
          {staleCount > 0 ? ` ${staleCount} wurden verworfen, weil sie auf nicht mehr existierende Daten verwiesen.` : ''}
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-32 space-y-2">
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
        {suggestions.length} Vorschläge — wähle aus, was angewendet werden soll.
        {staleCount > 0 ? ` (${staleCount} verworfen)` : ''}
      </p>

      {suggestions.map((s, i) => {
        const key = suggestionKey(s, i);
        return (
          <SuggestionCard
            key={key}
            suggestion={s}
            accepted={!!accepted[key]}
            onToggle={() => toggle(key)}
            clusters={clusters}
            microtasks={microtasks}
          />
        );
      })}

      {errorMessage && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2">
          <p className="text-xs text-red-700 dark:text-red-300">{errorMessage}</p>
        </div>
      )}

      <div className="fixed left-0 right-0 bottom-0 px-4 py-3 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          data-testid="review-apply-button"
          onClick={handleApply}
          disabled={acceptedCount === 0 || applying}
          className="w-full rounded-xl bg-rose-500 text-white py-3 font-semibold active:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          {applying
            ? 'Wende an…'
            : acceptedCount === 0
            ? 'Nichts ausgewählt'
            : `${acceptedCount} Vorschlag${acceptedCount === 1 ? '' : 'e'} anwenden`}
        </button>
      </div>
    </div>
  );
}
