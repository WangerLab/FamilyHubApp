import React, { useState } from 'react';
import { Plus, ChevronDown } from 'lucide-react';
import { useChores } from '../../contexts/ChoresContext';

const FREQUENCIES = [
  { id: '1x_week', label: '1× pro Woche', short: '1/Woche' },
  { id: '2x_week', label: '2× pro Woche', short: '2/Woche' },
  { id: '1x_month', label: '1× pro Monat', short: '1/Monat' },
  { id: 'custom', label: 'Alle N Tage', short: 'custom' },
];

export default function AddChoreInput() {
  const { addChore } = useChores();
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [freq, setFreq] = useState('1x_week');
  const [customDays, setCustomDays] = useState(7);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    await addChore({
      title,
      reset_frequency: freq,
      custom_days: freq === 'custom' ? Math.max(1, Number(customDays) || 7) : null,
    });
    setTitle(''); setFreq('1x_week'); setCustomDays(7); setExpanded(false);
    setBusy(false);
  };

  if (!expanded) {
    return (
      <button
        data-testid="add-chore-expand"
        onClick={() => setExpanded(true)}
        className="w-full flex items-center gap-2 h-12 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 px-3 active:opacity-70"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          Neue wiederkehrende Aufgabe
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 space-y-2 shadow-sm">
      <input
        data-testid="add-chore-title"
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="z.B. Staubsaugen, Badezimmer putzen…"
        className="w-full h-11 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:outline-none text-[15px]"
        style={{ fontFamily: 'DM Sans, sans-serif' }}
      />

      <div className="flex items-center gap-1.5 flex-wrap">
        {FREQUENCIES.map((f) => (
          <button
            key={f.id}
            data-testid={`freq-${f.id}`}
            onClick={() => setFreq(f.id)}
            className={`h-8 px-3 rounded-full text-xs font-semibold transition-all ${
              freq === f.id
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {freq === 'custom' && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 dark:text-slate-400">Alle</label>
          <input
            data-testid="custom-days"
            type="number"
            min="1"
            value={customDays}
            onChange={(e) => setCustomDays(e.target.value)}
            className="w-16 h-9 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-center tabular-nums focus:outline-none"
          />
          <span className="text-xs text-slate-500 dark:text-slate-400">Tage</span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          data-testid="add-chore-cancel"
          onClick={() => { setExpanded(false); setTitle(''); }}
          className="flex-1 h-10 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium active:bg-slate-50 dark:active:bg-slate-800"
        >
          Abbrechen
        </button>
        <button
          data-testid="add-chore-submit"
          onClick={submit}
          disabled={!title.trim() || busy}
          className="flex-[1.5] h-10 rounded-lg bg-blue-500 text-white text-sm font-semibold active:scale-[0.98] disabled:opacity-40"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Hinzufügen
        </button>
      </div>
    </div>
  );
}
