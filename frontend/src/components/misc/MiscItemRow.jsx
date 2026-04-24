import React, { useRef, useState } from 'react';
import { Check, FileText, Trash2 } from 'lucide-react';
import { useMisc } from '../../contexts/MiscContext';

export default function MiscItemRow({ item, shoppingMode }) {
  const { updateItem, toggleItem, softDelete, memberColorMap, memberNameMap } = useMisc();

  const checkboxSize = shoppingMode ? 'w-14 h-14' : 'w-6 h-6 mt-0.5';
  const checkIconSize = shoppingMode ? 'w-7 h-7' : 'w-3.5 h-3.5';

  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const [swipeOpen, setSwipeOpen] = useState(false);

  // Panel (note)
  const [panelOpen, setPanelOpen] = useState(false);
  const [noteValue, setNoteValue] = useState(item.note || '');

  // Name inline edit
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(item.name);

  const creatorColor = memberColorMap[item.created_by] || '#94a3b8';
  const creatorName = memberNameMap[item.created_by] || '';

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
    const note = noteValue.trim() || null;
    updateItem(item.id, { note });
    setPanelOpen(false);
  };
  const openPanel = () => {
    if (swipeOpen) return;
    setNoteValue(item.note || '');
    setPanelOpen(true);
  };
  const togglePanel = () => {
    if (swipeOpen) return;
    if (panelOpen) savePanel();
    else openPanel();
  };

  const saveName = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== item.name) {
      updateItem(item.id, { name: trimmed });
    }
    setEditingName(false);
  };
  const cancelNameEdit = () => {
    setNameValue(item.name);
    setEditingName(false);
  };
  const startNameEdit = () => {
    if (swipeOpen) return;
    setNameValue(item.name);
    setEditingName(true);
  };

  return (
    <div data-testid={`misc-item-${item.id}`} className="relative overflow-hidden bg-white dark:bg-slate-900">
      {/* Delete button revealed by swipe */}
      <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-red-500">
        <button
          data-testid={`delete-misc-${item.id}`}
          onClick={() => { setSwipeOpen(false); softDelete(item.id); }}
          className="w-full h-full flex flex-col items-center justify-center gap-1 active:opacity-70"
          aria-label="Löschen"
        >
          <Trash2 className="w-5 h-5 text-white" />
          <span className="text-[9px] text-white font-medium">Löschen</span>
        </button>
      </div>

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
            data-testid={`toggle-misc-${item.id}`}
            onClick={(e) => { e.stopPropagation(); if (!swipeOpen) toggleItem(item.id); }}
            aria-label={item.checked ? 'Als unerledigt markieren' : 'Als erledigt markieren'}
            className={`shrink-0 rounded-full border-2 flex items-center justify-center transition-colors active:scale-90 ${checkboxSize} ${
              item.checked
                ? 'bg-emerald-500/15 border-emerald-500'
                : 'border-slate-300 dark:border-slate-600 bg-transparent'
            }`}
          >
            {item.checked && <Check className={`${checkIconSize} text-emerald-400`} strokeWidth={3} />}
          </button>

          {/* Content */}
          <div className={`flex-1 min-w-0 transition-opacity duration-150 ${item.checked ? 'opacity-45' : ''}`}>
            {/* Name (inline editable) */}
            <div className="flex items-baseline gap-1.5">
              {editingName ? (
                <input
                  data-testid={`misc-name-input-${item.id}`}
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); saveName(); }
                    if (e.key === 'Escape') { e.preventDefault(); cancelNameEdit(); }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  onFocus={(e) => e.target.select()}
                  className="flex-1 min-w-0 text-lg leading-snug font-medium bg-transparent border-b-2 border-blue-400 focus:outline-none text-slate-900 dark:text-slate-50 px-0.5"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                />
              ) : (
                <button
                  data-testid={`misc-name-display-${item.id}`}
                  onClick={(e) => { e.stopPropagation(); startNameEdit(); }}
                  className={`text-lg font-medium text-slate-900 dark:text-slate-50 leading-snug text-left active:opacity-70 ${item.checked ? 'line-through' : ''}`}
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  {item.name}
                </button>
              )}
            </div>

            {/* Compact note preview when panel closed */}
            {!panelOpen && item.note && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate italic">
                {item.note}
              </p>
            )}

            {/* Details panel (note only) */}
            {panelOpen && (
              <div
                className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  data-testid={`misc-panel-note-${item.id}`}
                  type="text"
                  value={noteValue}
                  onChange={(e) => setNoteValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && savePanel()}
                  onBlur={savePanel}
                  placeholder="Notiz (z.B. Größe, Marke)"
                  autoFocus
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
              data-testid={`misc-note-toggle-${item.id}`}
              onClick={(e) => { e.stopPropagation(); togglePanel(); }}
              className={`p-0.5 rounded transition-colors active:opacity-70 ${
                item.note ? 'text-blue-500' : 'text-slate-300 dark:text-slate-600'
              }`}
              aria-label="Notiz"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
