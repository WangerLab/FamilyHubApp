import React, { useEffect, useRef, useState } from 'react';
import { Check, Zap, Bell, Trash2, Clock } from 'lucide-react';
import { useTodos } from '../../contexts/TodosContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDueDateDE, isOverdue } from '../../utils/smartDate';

const PRIORITY_META = {
  high:   { color: '#EF4444', emoji: '🔴' },
  medium: { color: '#F59E0B', emoji: '🟡' },
  low:    { color: '#22C55E', emoji: '🟢' },
};
const PRIORITY_ORDER = ['high', 'medium', 'low'];

export default function TodoRow({ todo }) {
  const { user } = useAuth();
  const { toggleTodo, updateTodo, softDelete, sendNudge, memberColorMap, memberNameMap } = useTodos();
  const [editingComment, setEditingComment] = useState(false);
  const [commentValue, setCommentValue] = useState(todo.comment || '');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(todo.title);
  const [nudgeBusy, setNudgeBusy] = useState(false);
  const [nudgeError, setNudgeError] = useState('');
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [swipeOpen, setSwipeOpen] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

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

  useEffect(() => {
    if (!showPriorityPicker) return;
    const handler = (e) => {
      if (!e.target.closest(`[data-testid="todo-row-${todo.id}"]`)) {
        setShowPriorityPicker(false);
      }
    };
    const t = setTimeout(() => document.addEventListener('click', handler), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('click', handler);
    };
  }, [showPriorityPicker, todo.id]);

  const prio = PRIORITY_META[todo.priority] || PRIORITY_META.medium;
  const overdue = isOverdue(todo.due_date, todo.completed);
  const assigneeColor = memberColorMap[todo.assigned_to] || '#94a3b8';
  const assigneeName = memberNameMap[todo.assigned_to];
  const creatorColor = memberColorMap[todo.created_by] || '#94a3b8';
  const creatorName = memberNameMap[todo.created_by] || '';

  // Quick-done: completed before due_date
  const quickDone =
    todo.completed && todo.completed_at && todo.due_date &&
    new Date(todo.completed_at) < new Date(todo.due_date);

  // Nudge cooldown
  const nudgeCooldown = (() => {
    if (!todo.nudge_sent_at) return 0;
    const elapsed = Date.now() - new Date(todo.nudge_sent_at).getTime();
    const ms = 24 * 60 * 60 * 1000 - elapsed;
    return ms > 0 ? Math.ceil(ms / (60 * 60 * 1000)) : 0; // hours left
  })();

  const canNudge =
    !todo.completed &&
    todo.assigned_to &&
    todo.assigned_to !== user?.id &&
    nudgeCooldown === 0;

  const handleNudge = async () => {
    setNudgeBusy(true); setNudgeError('');
    const res = await sendNudge(todo.id);
    if (!res.ok && res.reason === 'cooldown') setNudgeError('Bereits angestupst');
    setNudgeBusy(false);
  };

  const handleCommentSave = () => {
    const trimmed = commentValue.trim();
    if ((trimmed || null) !== (todo.comment || null)) {
      updateTodo(todo.id, { comment: trimmed || null });
    }
  };

  const handleTitleSave = async () => {
    const next = titleDraft.trim();
    if (!next) {
      setEditingTitle(false);
      setTitleDraft(todo.title);
      return;
    }
    if (next === todo.title) {
      setEditingTitle(false);
      return;
    }
    await updateTodo(todo.id, { title: next });
    setEditingTitle(false);
  };

  return (
    <div
      data-testid={`todo-row-${todo.id}`}
      className={`relative rounded-xl border bg-white dark:bg-slate-900 transition-all overflow-hidden ${
        overdue ? 'border-red-300 dark:border-red-800' : 'border-slate-200 dark:border-slate-800'
      } ${todo.completed ? 'opacity-70' : ''}`}
      style={overdue ? {
        boxShadow: '0 0 0 1px rgba(239,68,68,0.15), 0 4px 14px rgba(239,68,68,0.22)',
        animation: 'todoPulse 2.5s ease-in-out infinite',
      } : undefined}
    >
      {/* Delete button revealed by swipe */}
      <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-red-500">
        <button
          data-testid={`todo-delete-${todo.id}`}
          onClick={() => { setSwipeOpen(false); softDelete(todo.id); }}
          className="w-full h-full flex flex-col items-center justify-center gap-1 active:opacity-70"
          aria-label="Löschen"
        >
          <Trash2 className="w-5 h-5 text-white" />
          <span className="text-[9px] text-white font-medium">Löschen</span>
        </button>
      </div>

      {/* Sliding content layer */}
      <div
        className="relative bg-white dark:bg-slate-900 transition-transform duration-200 ease-out"
        style={{ transform: swipeOpen ? 'translateX(-80px)' : 'translateX(0)' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => swipeOpen && setSwipeOpen(false)}
      >
        {/* Priority stripe — tappable to change */}
        <button
          data-testid={`todo-priority-stripe-${todo.id}`}
          onClick={(e) => { e.stopPropagation(); if (!swipeOpen) setShowPriorityPicker((v) => !v); }}
          className="absolute left-0 top-0 bottom-0 w-1.5 active:opacity-70"
          style={{ backgroundColor: prio.color }}
          aria-label="Priorität ändern"
        />

        {showPriorityPicker && (
          <div
            data-testid={`priority-picker-${todo.id}`}
            className="absolute left-2 top-2 z-20 flex flex-col gap-1 p-1.5 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700"
          >
            {PRIORITY_ORDER.map((p) => {
              const meta = PRIORITY_META[p];
              const isCurrent = p === todo.priority;
              return (
                <button
                  key={p}
                  data-testid={`priority-pick-${p}-${todo.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateTodo(todo.id, { priority: p });
                    setShowPriorityPicker(false);
                  }}
                  aria-label={`Priorität ${p}`}
                  className={`w-9 h-9 rounded-full text-lg flex items-center justify-center active:scale-90 transition-transform ${
                    isCurrent ? 'ring-2 scale-110' : 'opacity-60'
                  }`}
                  style={{
                    backgroundColor: `${meta.color}18`,
                    '--tw-ring-color': meta.color,
                  }}
                >
                  {meta.emoji}
                </button>
              );
            })}
          </div>
        )}

        <div className="pl-5 pr-4 py-4 flex items-start gap-4">
          <button
            data-testid={`todo-toggle-${todo.id}`}
            onClick={(e) => { e.stopPropagation(); if (!swipeOpen) toggleTodo(todo.id); }}
            aria-label={todo.completed ? 'Als offen markieren' : 'Als erledigt markieren'}
            className={`shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center mt-1 active:scale-90 transition-transform ${
              todo.completed
                ? 'bg-slate-200 dark:bg-slate-700 border-slate-200 dark:border-slate-700'
                : 'bg-white dark:bg-slate-900'
            }`}
            style={!todo.completed ? { borderColor: prio.color } : {}}
          >
            {todo.completed && <Check className="w-5 h-5 text-slate-400 dark:text-slate-500" />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-1.5">
              {editingTitle ? (
                <input
                  data-testid={`todo-title-edit-${todo.id}`}
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={handleTitleSave}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleTitleSave(); }
                    if (e.key === 'Escape') {
                      setTitleDraft(todo.title);
                      setEditingTitle(false);
                    }
                  }}
                  className="flex-1 min-w-0 text-[17px] leading-normal text-slate-900 dark:text-slate-50 bg-slate-50 dark:bg-slate-800 px-2 py-1 -mx-2 -my-1 rounded outline-none focus:ring-2 focus:ring-blue-400"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                />
              ) : (
                <p
                  data-testid={`todo-title-${todo.id}`}
                  onClick={(e) => {
                    if (swipeOpen) return;
                    e.stopPropagation();
                    setTitleDraft(todo.title);
                    setEditingTitle(true);
                  }}
                  className={`flex-1 min-w-0 text-[17px] leading-normal text-slate-900 dark:text-slate-50 cursor-text ${
                    todo.completed ? 'line-through' : ''
                  }`}
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  {todo.title}
                </p>
              )}
              {quickDone && (
                <span
                  data-testid={`todo-quickdone-${todo.id}`}
                  className="text-sm shrink-0"
                  title="Schnell erledigt"
                >
                  ⚡
                </span>
              )}
            </div>

            {todo.comment && !editingComment && (
              <p
                data-testid={`todo-comment-display-${todo.id}`}
                onClick={(e) => { e.stopPropagation(); if (!swipeOpen) setEditingComment(true); }}
                className="text-[13px] leading-snug text-slate-500 dark:text-slate-400 mt-0.5 whitespace-pre-wrap"
              >
                {todo.comment}
              </p>
            )}
            {editingComment && (
              <textarea
                data-testid={`todo-comment-${todo.id}`}
                value={commentValue}
                onChange={(e) => setCommentValue(e.target.value)}
                onBlur={() => { handleCommentSave(); setEditingComment(false); }}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                placeholder="Kommentar hinzufügen…"
                rows={2}
                className="w-full mt-1 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
            )}

            {/* Meta row */}
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <span
                data-testid={`todo-priority-emoji-${todo.id}`}
                className="text-sm leading-none select-none"
                title="Priorität"
              >
                {prio.emoji}
              </span>
              {todo.due_date && (
                <span
                  data-testid={`todo-due-${todo.id}`}
                  className={`inline-flex items-center gap-1 px-1.5 h-5 rounded-md text-[11px] font-medium ${
                    overdue
                      ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  {formatDueDateDE(todo.due_date)}
                </span>
              )}
              {todo.assigned_to && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 h-5 rounded-md text-[11px] font-medium"
                  style={{ backgroundColor: `${assigneeColor}18`, color: assigneeColor }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: assigneeColor }} />
                  {assigneeName || '—'}
                </span>
              )}
              {!todo.comment && !editingComment && (
                <button
                  data-testid={`todo-add-comment-${todo.id}`}
                  onClick={(e) => { e.stopPropagation(); if (!swipeOpen) setEditingComment(true); }}
                  className="text-[11px] text-slate-400 dark:text-slate-500 font-medium active:opacity-60"
                >
                  + Notiz
                </button>
              )}
              {canNudge && (
                <button
                  data-testid={`todo-nudge-${todo.id}`}
                  onClick={(e) => { e.stopPropagation(); if (!swipeOpen) handleNudge(); }}
                  disabled={nudgeBusy}
                  className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 active:scale-95 disabled:opacity-50"
                >
                  <Bell className="w-3 h-3" />
                  Anstupsen
                </button>
              )}
              {!canNudge && todo.assigned_to && todo.assigned_to !== user?.id && nudgeCooldown > 0 && (
                <span className="text-[10px] text-slate-400 italic">in {nudgeCooldown}h wieder</span>
              )}
              {nudgeError && <span className="text-[10px] text-red-500">{nudgeError}</span>}
              {creatorName && (
                <span
                  className="ml-auto text-[13px] font-medium leading-none"
                  style={{ color: creatorColor }}
                  title="Erstellt von"
                >
                  {creatorName}
                </span>
              )}
            </div>

          </div>
        </div>
      </div>

      <style>{`
        @keyframes todoPulse {
          0%, 100% { box-shadow: 0 0 0 1px rgba(239,68,68,0.15), 0 4px 14px rgba(239,68,68,0.22); }
          50% { box-shadow: 0 0 0 1px rgba(239,68,68,0.35), 0 4px 22px rgba(239,68,68,0.45); }
        }
      `}</style>
    </div>
  );
}
