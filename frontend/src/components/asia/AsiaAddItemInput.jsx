import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  ASIA_CATEGORIES,
  detectAsiaCategory,
  detectAsiaCategoryWithConfidence,
  DEFAULT_ASIA_CATEGORY,
} from '../../constants/asiaCategories';
import { MATCH_EXACT } from '../../lib/categoryDetect';
import { useAuth } from '../../contexts/AuthContext';
import { useAsia } from '../../contexts/AsiaContext';

// Quantity parser: identical to grocery AddItemInput. Keeps "500 g Sojasauce"
// → { name: 'Sojasauce', quantity: 500, unit: 'g' }.
const UNIT_ALIASES = {
  'g': 'g', 'gramm': 'g',
  'kg': 'kg', 'kilo': 'kg', 'kilogramm': 'kg',
  'ml': 'ml', 'milliliter': 'ml',
  'l': 'L', 'liter': 'L',
  'stk': 'Stück', 'stück': 'Stück', 'stueck': 'Stück',
  'packung': 'Packung', 'packungen': 'Packung', 'pck': 'Packung', 'pkg': 'Packung',
  'dose': 'Dose', 'dosen': 'Dose',
  'flasche': 'Flasche', 'flaschen': 'Flasche',
  'bund': 'Bund',
  'glas': 'Glas', 'gläser': 'Glas', 'glaeser': 'Glas',
};

function parseQuantityFromName(input) {
  const original = input.trim();
  const match = original.match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-ZäöüÄÖÜ]+)\s+(.+)$/);
  if (!match) return { name: original, quantity: null, unit: null };

  const [, numStr, unitRaw, rest] = match;
  const canonicalUnit = UNIT_ALIASES[unitRaw.toLowerCase()];
  if (!canonicalUnit) return { name: original, quantity: null, unit: null };

  const quantity = parseFloat(numStr.replace(',', '.'));
  if (!quantity || quantity <= 0) return { name: original, quantity: null, unit: null };

  const name = rest.trim();
  if (!name) return { name: original, quantity: null, unit: null };

  return { name, quantity, unit: canonicalUnit };
}

export default function AsiaAddItemInput({ onAdd }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const { updateItem } = useAsia();

  const parsedPreview = value.trim() ? parseQuantityFromName(value.trim()) : null;
  const detectedCat = parsedPreview ? detectAsiaCategory(parsedPreview.name) : null;
  const detectedEmoji =
    detectedCat && detectedCat !== DEFAULT_ASIA_CATEGORY
      ? ASIA_CATEGORIES.find((c) => c.name === detectedCat)?.emoji
      : null;

  const submit = async () => {
    const raw = value.trim();
    if (!raw || busy) return;
    setBusy(true);
    const { name, quantity, unit } = parseQuantityFromName(raw);
    const { category, confidence } = detectAsiaCategoryWithConfidence(name);
    const inserted = await onAdd({ name, category, quantity, unit });
    setValue('');
    setBusy(false);

    // KI-Fallback bei nicht-exakten Matches (partial OR none).
    // Bei exact-Match (ganzes Wort matcht ein Keyword) vertrauen wir der Detection.
    if (inserted && confidence !== MATCH_EXACT && user?.id) {
      try {
        const r = await fetch('/api/categorize/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, name, mode: 'asia' }),
        });
        if (r.ok) {
          const { category: aiCategory } = await r.json();
          if (aiCategory && aiCategory !== DEFAULT_ASIA_CATEGORY) {
            await updateItem(inserted.id, { category: aiCategory });
          }
        }
      } catch {
        // Silent: Item bleibt in Default oder Keyword-Match-Kategorie
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="relative flex-1">
        <input
          data-testid="add-asia-item-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Asia-Artikel hinzufügen…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck
          className="w-full h-12 pl-4 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 text-base transition-colors"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        />
        {detectedEmoji && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none select-none">
            {detectedEmoji}
          </span>
        )}
      </div>
      <button
        data-testid="add-asia-item-button"
        onClick={submit}
        disabled={!value.trim() || busy}
        aria-label="Hinzufügen"
        className="w-12 h-12 rounded-xl flex items-center justify-center text-white disabled:opacity-40 active:scale-90 transition-transform duration-100 shadow-md"
        style={{ backgroundColor: '#14B8A6', boxShadow: '0 4px 6px -1px rgba(20, 184, 166, 0.2)' }}
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
}
