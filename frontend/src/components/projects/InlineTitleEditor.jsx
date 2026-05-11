import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

/**
 * Inline text editor with Save / Cancel actions.
 * Designed for single-line edits (e.g. title field) but reusable for any
 * single string field. Pass `onSave` and `onCancel` from the parent.
 * Parent owns the open/close state.
 *
 * Props:
 * - initialValue: string — current value of the field
 * - onSave: (newValue: string) => Promise<void> — async, may throw
 * - onCancel: () => void
 * - placeholder?: string
 * - ariaLabel?: string — for the input field
 */
export default function InlineTitleEditor({
  initialValue,
  onSave,
  onCancel,
  placeholder,
  ariaLabel,
}) {
  const [draft, setDraft] = useState(initialValue || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave() {
    if (!draft.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(draft.trim());
    } catch (e) {
      setError(e.message || 'Fehler beim Speichern');
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoFocus
        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xl font-bold text-slate-900 dark:text-slate-50"
        style={{ fontFamily: 'Manrope, sans-serif' }}
      />
      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={saving}
          className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-2 text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-1.5"
        >
          <X className="w-4 h-4" />
          Abbrechen
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !draft.trim()}
          className="flex-1 rounded-xl bg-rose-500 text-white py-2 text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-1.5"
        >
          <Check className="w-4 h-4" />
          {saving ? 'Speichere…' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}
