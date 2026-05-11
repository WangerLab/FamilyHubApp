import React from 'react';
import { Minus, Plus } from 'lucide-react';

/**
 * Stepper UI for numeric values with discrete range (default 1-5).
 * Used for the effort_weight field on microtasks. Parent owns the value
 * and the update path — this is purely presentational.
 *
 * Props:
 * - value: number — current value (clamped to min/max for display)
 * - onChange: (newValue: number) => void — called with the new value
 *   after a +/- tap (NOT the delta)
 * - min?: number — default 1
 * - max?: number — default 5
 * - ariaLabelMinus?: string
 * - ariaLabelPlus?: string
 */
export default function EffortWeightStepper({
  value,
  onChange,
  min = 1,
  max = 5,
  ariaLabelMinus = 'Wert verringern',
  ariaLabelPlus = 'Wert erhöhen',
}) {
  const current = typeof value === 'number' ? value : min;
  const canDecrement = current > min;
  const canIncrement = current < max;

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => canDecrement && onChange(current - 1)}
        disabled={!canDecrement}
        aria-label={ariaLabelMinus}
        className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center active:opacity-70 disabled:opacity-30"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span
        className="text-2xl font-bold text-slate-900 dark:text-slate-50 min-w-[2rem] text-center"
        style={{ fontFamily: 'Manrope, sans-serif' }}
      >
        {current}
      </span>
      <button
        type="button"
        onClick={() => canIncrement && onChange(current + 1)}
        disabled={!canIncrement}
        aria-label={ariaLabelPlus}
        className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center active:opacity-70 disabled:opacity-30"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
