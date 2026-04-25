import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { CATEGORIES, detectCategory, DEFAULT_CATEGORY } from '../../constants/categories';
import { useAuth } from '../../contexts/AuthContext';
import { useGrocery } from '../../contexts/GroceryContext';
import { useMisc } from '../../contexts/MiscContext';
import { crossDetect } from '../../lib/crossDetect';

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

export default function AddItemInput({ onAdd }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const { updateItem } = useGrocery();
  const { addItem: addMiscItem, showCrossMoveToast: miscShowCrossMoveToast } = useMisc();

  const parsedPreview = value.trim() ? parseQuantityFromName(value.trim()) : null;
  const detectedCat = parsedPreview ? detectCategory(parsedPreview.name) : null;
  const detectedEmoji = detectedCat ? CATEGORIES.find((c) => c.name === detectedCat)?.emoji : null;

  const submit = async () => {
    const raw = value.trim();
    if (!raw || busy) return;
    setBusy(true);
    const { name, quantity, unit } = parseQuantityFromName(raw);
    const cross = crossDetect(name, 'grocery');
    if (cross.shouldMoveTo === 'misc' && addMiscItem) {
      const insertedMisc = await addMiscItem({
        name,
        location_tag: cross.location_tag,
        note: null,
      });
      setValue('');
      setBusy(false);
      if (insertedMisc && miscShowCrossMoveToast) {
        miscShowCrossMoveToast(insertedMisc, 'grocery');
      }
      return;
    }
    const category = detectCategory(name);
    const inserted = await onAdd({ name, category, quantity, unit });
    setValue('');
    setBusy(false);

    if (inserted && category === DEFAULT_CATEGORY && user?.id) {
      try {
        const r = await fetch('/api/categorize/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, name, mode: 'grocery' }),
        });
        if (r.ok) {
          const { category: aiCategory } = await r.json();
          if (aiCategory && aiCategory !== DEFAULT_CATEGORY) {
            await updateItem(inserted.id, { category: aiCategory });
          }
        }
      } catch {
        // Silent: Item bleibt in Default, kein User-Feedback nötig
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
          data-testid="add-item-input"
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
        {detectedEmoji && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none select-none">
            {detectedEmoji}
          </span>
        )}
      </div>
      <button
        data-testid="add-item-button"
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
