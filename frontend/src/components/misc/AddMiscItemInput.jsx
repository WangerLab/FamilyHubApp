import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { MISC_LOCATIONS, detectLocation } from '../../constants/miscLocations';

export default function AddMiscItemInput({ onAdd }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const detectedLocation = value.trim() ? detectLocation(value.trim()) : null;
  const detectedMeta = detectedLocation
    ? MISC_LOCATIONS.find((l) => l.name === detectedLocation)
    : null;

  const submit = async () => {
    const name = value.trim();
    if (!name || busy) return;
    setBusy(true);
    const location_tag = detectLocation(name);
    await onAdd({ name, location_tag });
    setValue('');
    setBusy(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="relative flex-1">
        <input
          data-testid="add-misc-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Artikel hinzufügen…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck
          className="w-full h-12 pl-4 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base transition-colors"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        />
        {detectedMeta && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none select-none"
            title={detectedMeta.name}
          >
            {detectedMeta.emoji}
          </span>
        )}
      </div>
      <button
        data-testid="add-misc-button"
        onClick={submit}
        disabled={!value.trim() || busy}
        aria-label="Hinzufügen"
        className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white disabled:opacity-40 active:scale-90 transition-transform duration-100 shadow-md shadow-blue-500/20"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
}
