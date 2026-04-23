import React, { useRef, useState } from 'react';
import { Check, FileText, Trash2 } from 'lucide-react';
import { CATEGORIES } from '../../constants/categories';
import { useGrocery } from '../../contexts/GroceryContext';
import CategoryPicker from './CategoryPicker';

export default function GroceryItemRow({ item, shoppingMode }) {
  const { updateItem, toggleItem, softDelete, memberColorMap } = useGrocery();

  // Swipe state
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const [swipeOpen, setSwipeOpen] = useState(false);

  // Inline quantity editing
  const [editingQty, setEditingQty] = useState(false);
  const [qtyValue, setQtyValue] = useState(item.quantity != null ? String(item.quantity) : '');
  const [unitValue, setUnitValue] = useState(item.unit || '');

  // Note
  const [showNote, setShowNote] = useState(!!item.note);
  const [noteValue, setNoteValue] = useState(item.note || '');

  // Category picker
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const creatorColor = memberColorMap[item.created_by] || '#94a3b8';
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

  // --- Qty save ---
  const saveQty = () => {
    const parsed = parseFloat(qtyValue);
    const qty = !isNaN(parsed) && parsed > 0 ? parsed : null;
    const unit = unitValue.trim() || null;
    updateItem(item.id, { quantity: qty, unit });
    setEditingQty(false);
  };

  // --- Note save ---
  const saveNote = () => {
    updateItem(item.id, { note: noteValue.trim() || null });
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
              {/* Name */}
              <p
                className={`text-base text-slate-900 dark:text-slate-50 leading-snug ${item.checked ? 'line-through' : ''}`}
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                {item.name}
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

                {/* Quantity (inline editable) */}
                {editingQty ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      data-testid={`qty-input-${item.id}`}
                      type="number"
                      min="0.1"
                      step="0.5"
                      value={qtyValue}
                      onChange={(e) => setQtyValue(e.target.value)}
                      onBlur={saveQty}
                      onKeyDown={(e) => e.key === 'Enter' && saveQty()}
                      autoFocus
                      className="w-12 text-xs text-center border-b-2 border-blue-400 bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none"
                    />
                    <input
                      data-testid={`unit-input-${item.id}`}
                      type="text"
                      value={unitValue}
                      onChange={(e) => setUnitValue(e.target.value)}
                      onBlur={saveQty}
                      onKeyDown={(e) => e.key === 'Enter' && saveQty()}
                      placeholder="Einheit"
                      className="w-16 text-xs border-b-2 border-blue-400 bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none placeholder:text-slate-300"
                    />
                  </div>
                ) : (item.quantity != null || item.unit) ? (
                  <button
                    data-testid={`qty-display-${item.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!swipeOpen) {
                        setQtyValue(item.quantity != null ? String(item.quantity) : '');
                        setUnitValue(item.unit || '');
                        setEditingQty(true);
                      }
                    }}
                    className="text-[11px] text-slate-500 dark:text-slate-400 active:opacity-70 tabular-nums"
                  >
                    {item.quantity != null ? item.quantity : ''}{item.quantity != null && item.unit ? ' ' : ''}{item.unit || ''}
                  </button>
                ) : (
                  <button
                    data-testid={`qty-add-${item.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!swipeOpen) {
                        setQtyValue('');
                        setUnitValue('');
                        setEditingQty(true);
                      }
                    }}
                    className="text-[11px] text-slate-400 dark:text-slate-600 active:opacity-70 italic"
                  >
                    + Menge
                  </button>
                )}

                {/* Note toggle */}
                <button
                  data-testid={`note-toggle-${item.id}`}
                  onClick={(e) => { e.stopPropagation(); setShowNote((n) => !n); }}
                  className={`p-0.5 rounded transition-colors active:opacity-70 ${
                    item.note || showNote
                      ? 'text-blue-500'
                      : 'text-slate-300 dark:text-slate-600'
                  }`}
                  aria-label="Notiz"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Note field */}
              {showNote && (
                <textarea
                  data-testid={`note-field-${item.id}`}
                  value={noteValue}
                  onChange={(e) => setNoteValue(e.target.value)}
                  onBlur={saveNote}
                  placeholder="Notiz hinzufügen…"
                  rows={2}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full mt-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              )}
            </div>

            {/* Creator color dot */}
            <div
              className="w-2 h-2 rounded-full shrink-0 mt-1.5"
              style={{ backgroundColor: creatorColor }}
              title="Hinzugefügt von"
            />
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
