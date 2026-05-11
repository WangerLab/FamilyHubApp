import React, { useState } from 'react';
import { useProjects } from '../../contexts/ProjectsContext';

export default function AddClusterForm({ projectId, existingClusterCount, onCancel, onSaved }) {
  const { addCluster } = useProjects();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave() {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await addCluster(projectId, {
        name: name.trim(),
        description: description.trim() || null,
        cluster_order: existingClusterCount,
      });
      onSaved();
    } catch (e) {
      setError(e.message || 'Fehler beim Speichern');
      setSaving(false);
    }
  }

  return (
    <div
      data-testid="add-cluster-form"
      className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3"
    >
      <h3
        className="text-sm font-semibold text-slate-900 dark:text-slate-50"
        style={{ fontFamily: 'Manrope, sans-serif' }}
      >
        Neuen Cluster anlegen
      </h3>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Cluster-Name"
        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50"
        autoFocus
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Beschreibung (optional)"
        rows={2}
        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 resize-none"
      />
      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      )}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          disabled={saving}
          className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-2 text-sm font-medium disabled:opacity-40"
        >
          Abbrechen
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex-1 rounded-xl bg-rose-500 text-white py-2 text-sm font-medium disabled:opacity-40"
        >
          {saving ? 'Speichere…' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}
