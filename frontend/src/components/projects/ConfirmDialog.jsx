import React, { useEffect, useState } from 'react';

/**
 * Reusable confirm dialog for destructive actions (and beyond).
 * Centered modal — vs. bottom-sheet — for decisive yes/no choices.
 *
 * Props:
 * - open: boolean
 * - onConfirm: () => void — parent decides what to do; dialog does not auto-close
 * - onCancel: () => void — fires on Cancel, ESC, and backdrop click
 * - title: string — headline (e.g. "Projekt löschen?")
 * - message: string — body text (e.g. "4 Cluster mit 17 Aufgaben werden mitgelöscht.")
 * - confirmLabel?: string — default "Löschen"
 * - cancelLabel?: string — default "Abbrechen"
 * - destructive?: boolean — API stub for M-6; visual treatment uniform (rose-500)
 */
export default function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = 'Löschen',
  cancelLabel = 'Abbrechen',
  destructive = true,
}) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => setMounted(true));
    } else {
      setMounted(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open && !visible) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        onClick={onCancel}
      />
      <div
        className={`relative w-full sm:max-w-[400px] rounded-2xl bg-slate-50 dark:bg-slate-950 p-5 shadow-xl transition-all duration-200 ${mounted ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        onTransitionEnd={() => { if (!open) setVisible(false); }}
      >
        <h2
          className="text-lg font-semibold text-slate-900 dark:text-slate-50"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {title}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{message}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-2.5 text-sm font-medium active:opacity-70"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            aria-pressed={destructive ? true : undefined}
            className="flex-1 rounded-xl bg-rose-500 text-white py-2.5 text-sm font-semibold active:opacity-70"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
