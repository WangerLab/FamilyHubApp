import React, { useRef, useState } from 'react';
import { Check, FileText, Trash2 } from 'lucide-react';
import { useMisc } from '../../contexts/MiscContext';

export default function MiscItemRow({ item }) {
  const { updateItem, toggleItem, softDelete, memberColorMap } = useMisc();

  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const [swipeOpen, setSwipeOpen] = useState(false);
  const [showNote, setShowNote] = useState(!!item.note);
  const [noteValue, setNoteValue] = useState(item.note || '');

  const creatorColor = memberColorMap[item.created_by] || '#94a3b8';

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

  const saveNote = () => {
    updateItem(item.id, { note: noteValue.trim() || null });
  };

  return (
    <div
      data-testid={`misc-item-${item.id}`}
      className="relative overflow-hidden bg-white dark:bg-slate-900"
    >
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
          <button
            data-testid={`toggle-misc-${item.id}`}
            onClick={(e) => { e.stopPropagation(); if (!swipeOpen) toggleItem(item.id); }}
            aria-label={item.checked ? 'Als unerledigt markieren' : 'Als erledigt markieren'}
            className={`shrink-0 rounded-full border-2 flex items-center justify-center transition-colors active:scale-90 w-6 h-6 mt-0.5 ${
              item.checked
                ? 'bg-slate-200 dark:bg-slate-700 border-slate-200 dark:border-slate-700'
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
            }`}
            style={!item.checked ? { borderColor: creatorColor } : {}}
          >
            {item.checked && <Check className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />}
          </button>

          <div className={`flex-1 min-w-0 transition-opacity duration-150 ${item.checked ? 'opacity-45' : ''}`}>
            <p
              className={`text-base text-slate-900 dark:text-slate-50 leading-snug ${item.checked ? 'line-through' : ''}`}
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {item.name}
            </p>

            {/* Inline note */}
            {item.note && !showNote && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                {item.note}
              </p>
            )}

            <div className="flex items-center gap-2 mt-1">
              <button
                data-testid={`misc-note-toggle-${item.id}`}
                onClick={(e) => { e.stopPropagation(); setShowNote((n) => !n); }}
                className={`p-0.5 rounded transition-colors active:opacity-70 ${
                  item.note || showNote ? 'text-blue-500' : 'text-slate-300 dark:text-slate-600'
                }`}
                aria-label="Notiz"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
            </div>

            {showNote && (
              <textarea
                data-testid={`misc-note-field-${item.id}`}
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

          <div
            className="w-2 h-2 rounded-full shrink-0 mt-1.5"
            style={{ backgroundColor: creatorColor }}
            title="Hinzugefügt von"
          />
        </div>
      </div>
    </div>
  );
}
