import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function PrioRangeSheet({ isOpen, onClose, onSubmit, initialStart, initialEnd }) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [noLimit, setNoLimit] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const t = todayStr();
      setStart(initialStart || t);
      setEnd(initialEnd || addDays(t, 7));
      setNoLimit(false);
      setVisible(true);
      requestAnimationFrame(() => setMounted(true));
    } else {
      setMounted(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const rangeInvalid = !noLimit && !!start && !!end && end < start;
  const canSubmit = noLimit || (!!start && !!end && !rangeInvalid);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(noLimit ? { priority_start: null, priority_end: null } : { priority_start: start, priority_end: end });
    onClose();
  };

  const applyShortcut = (days) => {
    const t = todayStr();
    setStart(t);
    setEnd(addDays(t, days));
    setNoLimit(false);
  };

  if (!isOpen && !visible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative sm:max-w-[480px] w-full mx-auto max-h-[85dvh] rounded-t-3xl bg-slate-50 dark:bg-slate-950 overflow-y-auto transition-transform duration-300 ${
          mounted ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onTransitionEnd={() => { if (!isOpen) setVisible(false); }}
      >
        <div className="relative pt-3 pb-1">
          <div className="w-12 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto" />
          <button
            onClick={onClose}
            className="absolute right-3 top-3 p-2 rounded-xl text-slate-400 dark:text-slate-500 active:bg-slate-100 dark:active:bg-slate-800"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 pb-2">
          <p className="text-base font-bold text-slate-900 dark:text-slate-50" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Prio-Zeitraum setzen
          </p>
        </div>

        <div className="px-4 pb-6 space-y-4">
          <div className="flex gap-2">
            {[['Eine Woche', 7], ['Zwei Wochen', 14], ['Ein Monat', 30]].map(([label, days]) => (
              <button
                key={days}
                type="button"
                onClick={() => applyShortcut(days)}
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 py-2 active:bg-slate-100 dark:active:bg-slate-800"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Start</label>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                disabled={noLimit}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-40 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Ende</label>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                disabled={noLimit}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-40 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {rangeInvalid && (
            <p className="text-xs text-red-600 dark:text-red-400">Ende muss nach Start liegen.</p>
          )}

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={noLimit}
              onChange={(e) => setNoLimit(e.target.checked)}
              className="w-4 h-4 rounded accent-rose-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Kein Zeitlimit (offen)</span>
          </label>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm py-3 active:bg-slate-100 dark:active:bg-slate-800"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 rounded-xl bg-rose-500 text-white font-semibold text-sm py-3 active:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Setzen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
