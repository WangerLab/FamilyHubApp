import React, { useRef, useState } from 'react';
import { Check, FileText, Trash2 } from 'lucide-react';
import { CATEGORIES } from '../../constants/categories';
import { useGrocery } from '../../contexts/GroceryContext';
import CategoryPicker from './CategoryPicker';

export default function GroceryItemRow({ item, shoppingMode }) {
  const { updateItem, toggleItem, softDelete, memberColorMap, memberNameMap } = useGrocery();

  // Swipe state
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const [swipeOpen, setSwipeOpen] = useState(false);

  // Details panel (menge + einheit + notiz kombiniert)
  const [panelOpen, setPanelOpen] = useState(false);
  const [qtyValue, setQtyValue] = useState(item.quantity != null ? String(item.quantity) : '');
  const [unitValue, setUnitValue] = useState(item.unit || '');
  const [noteValue, setNoteValue] = useState(item.note || '');

  // Category picker
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const creatorColor = memberColorMap[item.created_by] || '#94a3b8';
  const creatorName = memberNameMap[item.created_by] || '';
  const hasQuantity = item.quantity != null || item.unit;
  const cat = CATEGORIES.find((c) => c.name === item.category);

  // --- Swipe handlers ---
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY);
    if (dx > 55 && dx > dy * 1.5) setSwipeOpen(true);
    else if (dx < -20) setSwipeOpen(false);
    touchStartX.current = null;
  };

  const savePanel = () => {
    const parsed = parseFloat(qtyValue);
    const qty = !isNaN(parsed) && parsed > 0 ? parsed : null;
    const unit = unitValue.trim() || null;
    const note = noteValue.trim() || null;
    updateItem(item.id, { quantity: qty, unit, note });
    setPanelOpen(false);
  };

  const openPanel = () => {
    if (swipeOpen) return;
    setQtyValue(item.quantity != null ? String(item.quantity) : '');
    setUnitValue(item.unit || '');
    setNoteValue(item.note || '');
    setPanelOpen(true);
  };

  const togglePanel = () => {
    if (swipeOpen) return;
    if (panelOpen) {
      savePanel();
    } else {
      openPanel();
    }
  };

  const checkboxSize = shoppingMode ? 'w-14 h-14' : 'w-6 h-6 mt-0.5';
  const checkIconSize = shoppingMode ? 'w-7 h-7' : 'w-3.5 h-3.5';

  return (
    <>
      <div
        data-testid={`grocery-item-${item.id}`}
        className="relative overflow-hidden bg-white dark:bg-slate-900"
      >
        {/* Delete button revealed by swipe */}
        <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-red-500">
          <button
            data-testid={`delete-item-${item.id}`}
            onClick={() => { setSwipeOpen(false); softDelete(item.id); }}
            className="w-full h-full flex flex-col items-center justify-center gap-1 active:opacity-70"
            aria-label="Löschen"
          >
            <Trash2 className="w-5 h-5 text-white" />
            <span className="text-[9px] text-white font-medium">Löschen</span>
          </button>
        </div>

        {/* Main content — slides left on swipe */}
        <div
          className="relative bg-white dark:bg-slate-900 transition-transform duration-200 ease-out"
          style={{ transform: swipeOpen ? 'translateX(-80px)' : 'translateX(0)' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => swipeOpen && setSwipeOpen(false)}
        >
          <div className="flex items-start gap-3 px-4 py-3">
            {/* Checkbox */}
            <button
              data-testid={`toggle-item-${item.id}`}
              onClick={(e) => { e.stopPropagation(); if (!swipeOpen) toggleItem(item.id); }}
              aria-label={item.checked ? 'Als unerledigt markieren' : 'Als erledigt markieren'}
              className={`shrink-0 rounded-full border-2 flex items-center justify-center transition-colors active:scale-90 ${checkboxSize} ${
                item.checked
                  ? 'bg-slate-200 dark:bg-slate-700 border-slate-200 dark:border-slate-700'
                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
              }`}
              style={!item.checked ? { borderColor: creatorColor } : {}}
            >
              {item.checked && (
                <Check className={`${checkIconSize} text-slate-400 dark:text-slate-500`} />
              )}
            </button>

            {/* Content */}
            <div className={`flex-1 min-w-0 transition-opacity duration-150 ${item.checked ? 'opacity-45' : ''}`}>
              {/* Name (with quantity in parens if set) */}
              <p
                className={`text-base text-slate-900 dark:text-slate-50 leading-snug ${item.checked ? 'line-through' : ''}`}
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                {item.name}
                {hasQuantity && (
                  <button
                    data-testid={`qty-display-${item.id}`}
                    onClick={(e) => { e.stopPropagation(); togglePanel(); }}
                    className="ml-1.5 text-sm text-slate-500 dark:text-slate-400 active:opacity-70 tabular-nums"
                  >
                    ({item.quantity != null ? item.quantity : ''}{item.quantity != null && item.unit ? ' ' : ''}{item.unit || ''})
                  </button>
                )}
              </p>

              {/* Meta row */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {/* Category badge */}
                <button
                  data-testid={`category-badge-${item.id}`}
                  onClick={(e) => { e.stopPropagation(); if (!swipeOpen) setShowCategoryPicker(true); }}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500 dark:text-slate-400 active:opacity-70 transition-opacity"
                >
                  <span>{cat?.emoji || '📦'}</span>
                  <span className="truncate max-w-[72px]">{item.category}</span>
                </button>

                {/* + Menge only when no quantity yet */}
                {!hasQuantity && (
                  <button
                    data-testid={`qty-add-${item.id}`}
                    onClick={(e) => { e.stopPropagation(); togglePanel(); }}
                    className="text-[11px] text-slate-400 dark:text-slate-600 active:opacity-70 italic"
                  >
                    + Menge
                  </button>
                )}
              </div>

              {/* Compact note preview when panel closed */}
              {!panelOpen && item.note && (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate italic">
                  {item.note}
                </p>
              )}

              {/* Details panel */}
              {panelOpen && (
                <div
                  className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2">
                    <input
                      data-testid={`panel-qty-${item.id}`}
                      type="number"
                      min="0"
                      step="any"
                      value={qtyValue}
                      onChange={(e) => setQtyValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && savePanel()}
                      placeholder="Menge"
                      autoFocus
                      className="w-16 text-sm text-center rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
                    />
                    <input
                      data-testid={`panel-unit-${item.id}`}
                      type="text"
                      value={unitValue}
                      onChange={(e) => setUnitValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && savePanel()}
                      placeholder="Einheit (g, L, Packung…)"
                      className="flex-1 text-sm rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <input
                    data-testid={`panel-note-${item.id}`}
                    type="text"
                    value={noteValue}
                    onChange={(e) => setNoteValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && savePanel()}
                    onBlur={savePanel}
                    placeholder="Notiz (z.B. nur Bio)"
                    className="w-full text-sm rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
                  />
                </div>
              )}
            </div>

            {/* Right column: creator name + note toggle */}
            <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
              <span
                className="text-[11px] font-medium leading-none"
                style={{ color: creatorColor }}
                title="Hinzugefügt von"
              >
                {creatorName}
              </span>
              <button
                data-testid={`note-toggle-${item.id}`}
                onClick={(e) => { e.stopPropagation(); togglePanel(); }}
                className={`p-0.5 rounded transition-colors active:opacity-70 ${
                  item.note ? 'text-blue-500' : 'text-slate-300 dark:text-slate-600'
                }`}
                aria-label="Details"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showCategoryPicker && (
        <CategoryPicker
          currentCategory={item.category}
          onSelect={(catName) => { updateItem(item.id, { category: catName }); setShowCategoryPicker(false); }}
          onClose={() => setShowCategoryPicker(false)}
        />
      )}
    </>
  );
}
