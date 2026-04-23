import React, { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, RotateCcw, ShoppingBag } from 'lucide-react';
import { CATEGORIES } from '../../constants/categories';
import { useGrocery } from '../../contexts/GroceryContext';
import { useMisc } from '../../contexts/MiscContext';
import { useAuth } from '../../contexts/AuthContext';
import AddItemInput from '../grocery/AddItemInput';
import GroceryItemRow from '../grocery/GroceryItemRow';
import SonstigesList from '../misc/SonstigesList';

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

function ResetDialog({ onConfirm, onCancel, subLabel }) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-x-4 z-50 top-1/2 -translate-y-1/2 max-w-[380px] mx-auto bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl">
        <h3
          className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {subLabel} leeren?
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

const SUBTAB_STORAGE_KEY = 'shopping-subtab';

export default function ShoppingTab() {
  const { member } = useAuth();
  const grocery = useGrocery();
  const misc = useMisc();

  const [subTab, setSubTab] = useState(
    () => localStorage.getItem(SUBTAB_STORAGE_KEY) || 'grocery'
  );
  const [showResetDialog, setShowResetDialog] = useState(false);
  const userColor = member?.color || '#3B82F6';

  useEffect(() => {
    localStorage.setItem(SUBTAB_STORAGE_KEY, subTab);
  }, [subTab]);

  // ---- Grocery derived ----
  const groupedGrocery = useMemo(() => {
    const groups = {};
    CATEGORIES.forEach((cat) => {
      const catItems = grocery.items.filter((i) => i.category === cat.name);
      if (!catItems.length) return;
      if (grocery.shoppingMode) {
        const unchecked = catItems.filter((i) => !i.checked).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const checked = catItems.filter((i) => i.checked);
        groups[cat.name] = [...unchecked, ...checked];
      } else {
        groups[cat.name] = [...catItems].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }
    });
    return groups;
  }, [grocery.items, grocery.shoppingMode]);

  const scrollGroupBelowHeader = (selector) => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const groupEl = document.querySelector(selector);
      const mainEl = groupEl?.closest('main');
      const headerEl = groupEl?.closest('main')?.querySelector('[data-shopping-header]');
      if (!groupEl || !mainEl || !headerEl) return;
      const headerBottom = headerEl.getBoundingClientRect().bottom;
      const groupTop = groupEl.getBoundingClientRect().top;
      const offset = (groupTop - headerBottom) + mainEl.scrollTop;
      mainEl.scrollTo({ top: offset, behavior: 'smooth' });
    }));
  };

  const handleAddGrocery = async (data) => {
    await grocery.addItem(data);
    const catId = CATEGORIES.find((c) => c.name === data.category)?.id;
    if (catId) scrollGroupBelowHeader(`[data-category-id="${catId}"]`);
  };

  const handleAddMisc = async (data) => {
    await misc.addItem(data);
    const tag = data.location_tag || 'Sonstiges';
    scrollGroupBelowHeader(`[data-tag="${CSS.escape(tag)}"]`);
  };

  const handleReset = async () => {
    if (subTab === 'grocery') await grocery.clearList();
    else await misc.clearList();
    setShowResetDialog(false);
  };

  const catStickyTop = '170px';
  const isGrocery = subTab === 'grocery';
  const itemsForSubTab = isGrocery ? grocery.items : misc.items;
  const uncheckedForSubTab = isGrocery ? grocery.uncheckedCount : misc.uncheckedCount;

  return (
    <div data-testid="shopping-tab" className="-mx-4">
      {/* ---- Sticky header ---- */}
      <div
        data-shopping-header
        className="sticky z-40 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800"
        style={{ top: '0', minHeight: '170px' }}
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
            {uncheckedForSubTab > 0 && (
              <span
                data-testid="unchecked-count-badge"
                className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center"
              >
                {uncheckedForSubTab}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              data-testid="shopping-mode-toggle"
              onClick={grocery.toggleShoppingMode}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-xl text-sm font-medium active:scale-95 transition-all duration-150 ${
                grocery.shoppingMode
                  ? 'text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
              style={grocery.shoppingMode ? { backgroundColor: userColor } : {}}
              aria-pressed={grocery.shoppingMode}
            >
              <ShoppingCart className="w-4 h-4" />
              {grocery.shoppingMode ? 'Fertig' : 'Einkaufen'}
            </button>
            <button
              data-testid="reset-list-button"
              onClick={() => setShowResetDialog(true)}
              disabled={itemsForSubTab.length === 0}
              aria-label="Liste leeren"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 disabled:opacity-30 active:bg-slate-100 dark:active:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Segmented control */}
        <div className="px-4 pt-2 pb-1">
          <div
            role="tablist"
            className="relative flex h-10 rounded-xl bg-slate-200/70 dark:bg-slate-800/70 p-0.5"
          >
            <SubTabButton
              testid="subtab-grocery"
              active={isGrocery}
              onClick={() => setSubTab('grocery')}
              badge={grocery.uncheckedCount}
              color={userColor}
              label="Nahrungsmittel"
            />
            <SubTabButton
              testid="subtab-sonstiges"
              active={!isGrocery}
              onClick={() => setSubTab('sonstiges')}
              badge={misc.uncheckedCount}
              color={userColor}
              label="Sonstiges"
            />
          </div>
        </div>

        {/* Add input (mode-specific) */}
        {isGrocery ? (
          <AddItemInput onAdd={handleAddGrocery} />
        ) : (
          <SonstigesList.AddInput onAdd={handleAddMisc} />
        )}

      </div>

      {/* ---- Items list ---- */}
      {isGrocery ? (
        grocery.loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-blue-500 animate-spin" />
          </div>
        ) : grocery.items.length === 0 ? (
          <EmptyState color={userColor} />
        ) : (
          <div>
            {CATEGORIES.map((cat) => {
              const catItems = groupedGrocery[cat.name];
              if (!catItems?.length) return null;
              const uncheckedInCat = catItems.filter((i) => !i.checked).length;
              return (
                <div key={cat.id} data-category-id={cat.id} style={{ scrollMarginTop: catStickyTop }}>
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
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {catItems.map((item) => (
                      <GroceryItemRow key={item.id} item={item} shoppingMode={grocery.shoppingMode} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <SonstigesList stickyTop={catStickyTop} shoppingMode={grocery.shoppingMode} />
      )}

      {showResetDialog && (
        <ResetDialog
          onConfirm={handleReset}
          onCancel={() => setShowResetDialog(false)}
          subLabel={isGrocery ? 'Nahrungsmittel' : 'Sonstiges'}
        />
      )}

      {/* Undo snackbars — grocery */}
      {grocery.pendingDelete && (
        <UndoSnackbar
          testid="undo-snackbar"
          name={grocery.pendingDelete.item.name}
          onUndo={grocery.undoDelete}
        />
      )}
      {/* Undo snackbars — misc */}
      {misc.pendingDelete && (
        <UndoSnackbar
          testid="undo-snackbar-misc"
          name={misc.pendingDelete.item.name}
          onUndo={misc.undoDelete}
        />
      )}
    </div>
  );
}

function SubTabButton({ testid, active, onClick, badge, color, label }) {
  return (
    <button
      data-testid={testid}
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 relative rounded-lg text-sm font-semibold transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-1.5 ${
        active
          ? 'bg-white dark:bg-slate-900 shadow-sm'
          : 'text-slate-500 dark:text-slate-400'
      }`}
      style={active ? { color, fontFamily: 'Manrope, sans-serif' } : { fontFamily: 'Manrope, sans-serif' }}
    >
      <span>{label}</span>
      {badge > 0 && (
        <span
          data-testid={`${testid}-badge`}
          className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center leading-none"
          style={{
            backgroundColor: active ? color : '#94a3b8',
            color: 'white',
          }}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

function UndoSnackbar({ testid, name, onUndo }) {
  return (
    <div
      data-testid={testid}
      className="fixed z-50 left-3 right-3 max-w-[406px] mx-auto"
      style={{ bottom: 'calc(80px + env(safe-area-inset-bottom) + 12px)' }}
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900 dark:bg-slate-100 shadow-xl shadow-black/20">
        <p
          className="flex-1 text-sm font-medium text-white dark:text-slate-900 truncate"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          „{name}" gelöscht
        </p>
        <button
          data-testid="undo-delete-button"
          onClick={onUndo}
          className="text-sm font-bold text-blue-400 dark:text-blue-600 active:opacity-70 shrink-0"
        >
          Rückgängig
        </button>
      </div>
    </div>
  );
}
