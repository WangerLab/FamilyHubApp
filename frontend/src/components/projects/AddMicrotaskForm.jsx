import React, { useState } from 'react';
import { useProjects } from '../../contexts/ProjectsContext';

export default function AddMicrotaskForm({ clusterId, existingTaskCount, onCancel, onSaved }) {
  const { addMicrotask } = useProjects();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave() {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await addMicrotask(clusterId, {
        title: title.trim(),
        description: description.trim() || null,
        effort_weight: 2,
        depends_on: [],
        suggested_for: null,
        task_order: existingTaskCount,
      });
      onSaved();
    } catch (e) {
      setError(e.message || 'Fehler beim Speichern');
      setSaving(false);
    }
  }

  return (
    <div
      data-testid="add-microtask-form"
      className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 my-2 space-y-2"
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Aufgabentitel"
        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-50"
        autoFocus
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Beschreibung (optional)"
        rows={2}
        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 resize-none"
      />
      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={saving}
          className="flex-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-1.5 text-xs font-medium disabled:opacity-40"
        >
          Abbrechen
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="flex-1 rounded-lg bg-rose-500 text-white py-1.5 text-xs font-medium disabled:opacity-40"
        >
          {saving ? 'Speichere…' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}
