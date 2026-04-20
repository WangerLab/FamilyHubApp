import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ShoppingCart, RotateCcw, ShoppingBag } from 'lucide-react';
import { CATEGORIES } from '../../constants/categories';
import { useGrocery } from '../../contexts/GroceryContext';
import { useAuth } from '../../contexts/AuthContext';
import AddItemInput from '../grocery/AddItemInput';
import GroceryItemRow from '../grocery/GroceryItemRow';
import BrainDump from '../grocery/BrainDump';

function EmptyState({ color }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 shadow-lg"
        style={{ backgroundColor: `${color}15`, border: `2px solid ${color}30` }}
      >
        <ShoppingBag className="w-10 h-10" style={{ color: `${color}80` }} strokeWidth={1.5} />
      </div>
      <h3
        className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2"
        style={{ fontFamily: 'Manrope, sans-serif' }}
      >
        Einkaufsliste ist leer
      </h3>
      <p className="text-sm text-slate-400 dark:text-slate-500 max-w-[240px]">
        Was braucht ihr? Tippe oben einen Artikel ein und los geht's!
      </p>
    </div>
  );
}

function ResetDialog({ onConfirm, onCancel }) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-x-4 z-50 top-1/2 -translate-y-1/2 max-w-[380px] mx-auto bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl">
        <h3
          className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Liste leeren?
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          Alle Artikel werden gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-12 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium text-sm active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
          >
            Abbrechen
          </button>
          <button
            data-testid="reset-confirm-button"
            onClick={onConfirm}
            className="flex-1 h-12 rounded-xl bg-red-500 text-white font-medium text-sm active:scale-[0.97] transition-transform"
          >
            Leeren
          </button>
        </div>
      </div>
    </>
  );
}

export default function ShoppingTab() {
  const { member } = useAuth();
  const {
    items, loading, uncheckedCount,
    shoppingMode, toggleShoppingMode,
    addItem, softDelete, undoDelete, pendingDelete, clearList,
  } = useGrocery();

  const [showResetDialog, setShowResetDialog] = useState(false);
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(116);
  const userColor = member?.color || '#3B82F6';

  // Measure sticky header height for category sticky offset
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setHeaderHeight(e.contentRect.height);
    });
    ro.observe(el);
    setHeaderHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

  // Group + sort items by category
  const groupedItems = useMemo(() => {
    const groups = {};
    CATEGORIES.forEach((cat) => {
      const catItems = items.filter((i) => i.category === cat.name);
      if (!catItems.length) return;
      if (shoppingMode) {
        // Shopping mode: unchecked first, then checked
        const unchecked = catItems.filter((i) => !i.checked).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const checked = catItems.filter((i) => i.checked);
        groups[cat.name] = [...unchecked, ...checked];
      } else {
        // Normal mode: newest first regardless of checked
        groups[cat.name] = [...catItems].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }
    });
    return groups;
  }, [items, shoppingMode]);

  const handleAdd = async (data) => {
    await addItem(data);
    // Scroll to the new item's category after a brief render delay
    setTimeout(() => {
      const el = document.querySelector(`[data-category-id="${CATEGORIES.find((c) => c.name === data.category)?.id}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 250);
  };

  const handleReset = async () => {
    await clearList();
    setShowResetDialog(false);
  };

  const catStickyTop = `calc(64px + env(safe-area-inset-top) + ${headerHeight}px)`;

  return (
    // -mx-4 breaks out of AppShell's 1rem horizontal padding for full-width items
    <div data-testid="shopping-tab" className="-mx-4">
      {/* ---- Sticky header + add input ---- */}
      <div
        ref={headerRef}
        className="sticky z-40 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800"
        style={{ top: 'calc(64px + env(safe-area-inset-top))' }}
      >
        {/* Title row */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="flex items-center gap-2">
            <h2
              className="text-xl font-bold text-slate-900 dark:text-slate-50"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Einkaufsliste
            </h2>
            {uncheckedCount > 0 && (
              <span
                data-testid="unchecked-count-badge"
                className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center"
              >
                {uncheckedCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {/* Shopping mode toggle */}
            <button
              data-testid="shopping-mode-toggle"
              onClick={toggleShoppingMode}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-xl text-sm font-medium active:scale-95 transition-all duration-150 ${
                shoppingMode
                  ? 'text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
              style={shoppingMode ? { backgroundColor: userColor } : {}}
              aria-pressed={shoppingMode}
            >
              <ShoppingCart className="w-4 h-4" />
              {shoppingMode ? 'Fertig' : 'Einkaufen'}
            </button>
            {/* Reset */}
            <button
              data-testid="reset-list-button"
              onClick={() => setShowResetDialog(true)}
              disabled={items.length === 0}
              aria-label="Liste leeren"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 disabled:opacity-30 active:bg-slate-100 dark:active:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Add input */}
        <AddItemInput onAdd={handleAdd} />

        {/* AI Brain Dump (collapsible) */}
        <BrainDump />
      </div>

      {/* ---- Items list ---- */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-blue-500 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState color={userColor} />
      ) : (
        <div>
          {CATEGORIES.map((cat) => {
            const catItems = groupedItems[cat.name];
            if (!catItems?.length) return null;
            const uncheckedInCat = catItems.filter((i) => !i.checked).length;

            return (
              <div key={cat.id} data-category-id={cat.id}>
                {/* Sticky category header */}
                <div
                  className="sticky z-30 flex items-center gap-2 px-4 py-1.5 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800"
                  style={{ top: catStickyTop }}
                >
                  <span className="text-base">{cat.emoji}</span>
                  <span
                    className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  >
                    {cat.name}
                  </span>
                  <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                    {uncheckedInCat}/{catItems.length}
                  </span>
                </div>

                {/* Items in this category */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {catItems.map((item) => (
                    <GroceryItemRow
                      key={item.id}
                      item={item}
                      shoppingMode={shoppingMode}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Reset dialog ---- */}
      {showResetDialog && (
        <ResetDialog onConfirm={handleReset} onCancel={() => setShowResetDialog(false)} />
      )}

      {/* ---- Undo snackbar ---- */}
      {pendingDelete && (
        <div
          data-testid="undo-snackbar"
          className="fixed z-50 left-3 right-3 max-w-[406px] mx-auto"
          style={{ bottom: 'calc(80px + env(safe-area-inset-bottom) + 12px)' }}
        >
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900 dark:bg-slate-100 shadow-xl shadow-black/20">
            <p
              className="flex-1 text-sm font-medium text-white dark:text-slate-900 truncate"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              „{pendingDelete.item.name}" gelöscht
            </p>
            <button
              data-testid="undo-delete-button"
              onClick={undoDelete}
              className="text-sm font-bold text-blue-400 dark:text-blue-600 active:opacity-70 shrink-0"
            >
              Rückgängig
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
