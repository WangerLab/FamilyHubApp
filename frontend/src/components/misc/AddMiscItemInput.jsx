import React, { useState } from 'react';
import { Plus, ChevronDown } from 'lucide-react';
import { MISC_LOCATIONS } from '../../constants/miscLocations';

export default function AddMiscItemInput({ onAdd }) {
  const [value, setValue] = useState('');
  const [tag, setTag] = useState('Sonstiges');
  const [showPicker, setShowPicker] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const [busy, setBusy] = useState(false);

  const currentTag = MISC_LOCATIONS.find((l) => l.name === tag) || { name: tag, emoji: '🏷️', color: '#64748b' };

  const submit = async () => {
    const name = value.trim();
    if (!name || busy) return;
    setBusy(true);
    await onAdd({ name, location_tag: tag });
    setValue('');
    setBusy(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
  };

  const selectTag = (name) => {
    setTag(name);
    setShowPicker(false);
    setCustomMode(false);
  };

  const applyCustomTag = () => {
    const t = customTag.trim();
    if (!t) return;
    setTag(t);
    setShowPicker(false);
    setCustomMode(false);
    setCustomTag('');
  };

  return (
    <div className="px-4 py-2 space-y-2">
      <div className="flex items-center gap-2">
        <input
          data-testid="add-misc-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Artikel hinzufügen…"
          autoComplete="off"
          className="flex-1 h-12 pl-4 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base transition-colors"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        />
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

      {/* Tag selector */}
      <button
        data-testid="misc-tag-selector"
        onClick={() => setShowPicker((v) => !v)}
        className="flex items-center gap-2 h-8 px-3 rounded-full text-xs font-medium active:opacity-70 transition-opacity"
        style={{
          backgroundColor: `${currentTag.color}18`,
          color: currentTag.color,
        }}
      >
        <span className="text-sm">{currentTag.emoji}</span>
        <span className="truncate max-w-[160px]">{currentTag.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPicker ? 'rotate-180' : ''}`} />
      </button>

      {showPicker && (
        <div
          data-testid="misc-tag-picker"
          className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
        >
          {MISC_LOCATIONS.map((loc) => (
            <button
              key={loc.id}
              data-testid={`misc-tag-option-${loc.id}`}
              onClick={() => selectTag(loc.name)}
              className={`flex items-center gap-1 h-8 px-3 rounded-full text-xs font-medium transition-all ${
                tag === loc.name ? 'ring-2 ring-offset-1 ring-offset-transparent' : ''
              }`}
              style={{
                backgroundColor: `${loc.color}18`,
                color: loc.color,
                '--tw-ring-color': loc.color,
              }}
            >
              <span>{loc.emoji}</span>
              {loc.name}
            </button>
          ))}
          {customMode ? (
            <div className="flex items-center gap-1 w-full mt-1">
              <input
                data-testid="misc-custom-tag-input"
                autoFocus
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyCustomTag()}
                placeholder="Eigener Tag…"
                className="flex-1 h-8 px-3 rounded-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
              />
              <button
                data-testid="misc-custom-tag-apply"
                onClick={applyCustomTag}
                disabled={!customTag.trim()}
                className="h-8 px-3 rounded-full text-xs font-medium bg-blue-500 text-white disabled:opacity-40"
              >
                Ok
              </button>
            </div>
          ) : (
            <button
              data-testid="misc-custom-tag-toggle"
              onClick={() => setCustomMode(true)}
              className="h-8 px-3 rounded-full text-xs font-medium bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-600 active:opacity-70"
            >
              + Eigener Tag
            </button>
          )}
        </div>
      )}
    </div>
  );
}
