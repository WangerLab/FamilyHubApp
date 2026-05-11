import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

/**
 * Inline multi-line text editor with Save / Cancel actions.
 * Designed for optional fields like description or note — empty values
 * are allowed and saved as null. Parent owns the open/close state.
 *
 * Props:
 * - initialValue: string | null — current value of the field
 * - onSave: (newValue: string | null) => Promise<void> — async, may throw
 * - onCancel: () => void
 * - placeholder?: string
 * - ariaLabel?: string
 * - rows?: number — textarea rows, default 4
 */
export default function InlineTextareaEditor({
  initialValue,
  onSave,
  onCancel,
  placeholder,
  ariaLabel,
  rows = 4,
}) {
  const [draft, setDraft] = useState(initialValue || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const trimmed = draft.trim();
      await onSave(trimmed.length === 0 ? null : trimmed);
    } catch (e) {
      setError(e.message || 'Fehler beim Speichern');
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoFocus
        rows={rows}
        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 resize-none whitespace-pre-wrap"
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
          disabled={saving}
          className="flex-1 rounded-xl bg-rose-500 text-white py-2 text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-1.5"
        >
          <Check className="w-4 h-4" />
          {saving ? 'Speichere…' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}
