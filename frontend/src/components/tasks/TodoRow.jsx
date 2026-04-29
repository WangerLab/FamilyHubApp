import React, { useEffect, useRef, useState } from 'react';
import { Check, Zap, Bell, Trash2, Clock } from 'lucide-react';
import { useTodos } from '../../contexts/TodosContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDueDateDE, isOverdue, toDatetimeLocal, isToday, relativeCompletedDE, quickDateAt, nextMondayAt } from '../../utils/smartDate';

const PRIORITY_META = {
  high:   { color: '#EF4444', emoji: '🔴' },
  medium: { color: '#F59E0B', emoji: '🟡' },
  low:    { color: '#22C55E', emoji: '🟢' },
};
const PRIORITY_ORDER = ['high', 'medium', 'low'];

export default function TodoRow({ todo }) {
  const { user } = useAuth();
  const { toggleTodo, updateTodo, softDelete, sendNudge, undoNudge, acknowledgeNudge, memberColorMap, memberNameMap, houseMembers } = useTodos();
  const [editingComment, setEditingComment] = useState(false);
  const [commentValue, setCommentValue] = useState(todo.comment || '');
  const [commentExpanded, setCommentExpanded] = useState(false);
  const [commentOverflows, setCommentOverflows] = useState(false);
  const commentRef = useRef(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(todo.title);
  const [editingDue, setEditingDue] = useState(false);
  const [nudgeBusy, setNudgeBusy] = useState(false);
  const [nudgeError, setNudgeError] = useState('');
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [swipeOpen, setSwipeOpen] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const priorityPickerRef = useRef(null);
  const priorityTriggerRef = useRef(null);
  const assigneePickerRef = useRef(null);
  const assigneeTriggerRef = useRef(null);

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
      if (priorityPickerRef.current?.contains(e.target)) return;
      if (priorityTriggerRef.current?.contains(e.target)) return;
      setShowPriorityPicker(false);
    };
    const t = setTimeout(() => document.addEventListener('click', handler), 0);
    return () => { clearTimeout(t); document.removeEventListener('click', handler); };
  }, [showPriorityPicker]);

  useEffect(() => {
    if (!showAssigneePicker) return;
    const handler = (e) => {
      if (assigneePickerRef.current?.contains(e.target)) return;
      if (assigneeTriggerRef.current?.contains(e.target)) return;
      setShowAssigneePicker(false);
    };
    const t = setTimeout(() => document.addEventListener('click', handler), 0);
    return () => { clearTimeout(t); document.removeEventListener('click', handler); };
  }, [showAssigneePicker]);

  useEffect(() => {
    if (!todo.comment || editingComment) {
      setCommentOverflows(false);
      return;
    }
    const el = commentRef.current;
    if (!el) return;
    setCommentOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [todo.comment, editingComment, commentExpanded]);

  useEffect(() => {
    if (!editingDue) return;
    const handler = (e) => {
      if (!e.target.closest(`[data-testid="todo-row-${todo.id}"]`)) {
        setEditingDue(false);
      }
    };
    const t = setTimeout(() => document.addEventListener('click', handler), 0);
    return () => { clearTimeout(t); document.removeEventListener('click', handler); };
  }, [editingDue, todo.id]);

  const prio = PRIORITY_META[todo.priority] || PRIORITY_META.medium;
  const overdue = isOverdue(todo.due_date, todo.completed);
  const dueToday = !todo.completed && !overdue && isToday(todo.due_date);
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

  const isSenderOfNudge = todo.nudge_sent_by && todo.nudge_sent_by === user?.id && nudgeCooldown > 0;
  const isReceiverOfNudge = todo.nudge_sent_at && todo.assigned_to === user?.id && todo.nudge_sent_by !== user?.id;

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

  const handleDueChange = async (e) => {
    const val = e.target.value;
    if (!val) {
      await updateTodo(todo.id, { due_date: null });
    } else {
      const iso = new Date(val).toISOString();
      await updateTodo(todo.id, { due_date: iso });
    }
    setEditingDue(false);
  };

  const setQuickDate = async (offsetDays) => {
    await updateTodo(todo.id, { due_date: quickDateAt(offsetDays).toISOString() });
    setEditingDue(false);
  };

  const setNextMonday = async () => {
    await updateTodo(todo.id, { due_date: nextMondayAt().toISOString() });
    setEditingDue(false);
  };

  return (
    <div
      data-testid={`todo-row-${todo.id}`}
      className={`relative rounded-xl border bg-white dark:bg-slate-900 shadow-card transition-all overflow-hidden ${
        overdue ? 'border-red-300 dark:border-red-800' : 'border-slate-200 dark:border-slate-400'
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
          type="button"
          ref={priorityTriggerRef}
          data-testid={`todo-priority-stripe-${todo.id}`}
          onClick={(e) => { e.stopPropagation(); if (!swipeOpen) setShowPriorityPicker((v) => !v); }}
          className="absolute left-0 top-0 bottom-0 w-4 active:opacity-80 cursor-pointer"
          style={{ backgroundColor: prio.color }}
          aria-label="Priorität ändern"
        />

        {showPriorityPicker && (
          <div
            ref={priorityPickerRef}
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

        {/* Creator ↓ Assignee block — top right of card */}
        <div className="absolute top-3 right-3 z-10 flex flex-col items-center gap-1 pointer-events-none">
          {creatorName && (
            <span
              className="text-[13px] font-bold pointer-events-auto leading-none px-2 py-1 rounded-md border-2 bg-transparent cursor-default select-none"
              style={{ color: creatorColor, borderColor: creatorColor }}
              title="Erstellt von"
            >
              {creatorName}
            </span>
          )}
          {/* Custom arrow: shorter + thicker, in assignee color */}
          <svg
            width="12"
            height="14"
            viewBox="0 0 12 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="pointer-events-none"
          >
            <line
              x1="6"
              y1="0"
              x2="6"
              y2="10"
              stroke={assigneeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <polyline
              points="2,8 6,13 10,8"
              stroke={assigneeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          {(() => {
            const isBoth = !todo.assigned_to;
            const triggerStyle = isBoth
              ? { backgroundColor: '#64748B', borderColor: '#64748B' }
              : { backgroundColor: assigneeColor, borderColor: assigneeColor };
            return (
              <button
                ref={assigneeTriggerRef}
                data-testid={`todo-assignee-${todo.id}`}
                onClick={(e) => { e.stopPropagation(); if (!swipeOpen) setShowAssigneePicker((v) => !v); }}
                className="text-[14px] font-bold pointer-events-auto active:opacity-80 leading-none px-2 py-1 rounded-md border-2 text-white"
                style={triggerStyle}
                aria-label="Zuständigkeit ändern"
              >
                {isBoth ? 'Beide' : assigneeName}
              </button>
            );
          })()}
        </div>

        {showAssigneePicker && (
          <div
            ref={assigneePickerRef}
            data-testid={`assignee-picker-${todo.id}`}
            className="absolute right-[88px] top-2 z-30 flex flex-col gap-1 p-1.5 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 min-w-[110px]"
          >
            {houseMembers.map((m) => {
              const isCurrent = m.user_id === todo.assigned_to;
              return (
                <button
                  key={m.user_id}
                  data-testid={`assignee-pick-${m.user_id}-${todo.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateTodo(todo.id, { assigned_to: m.user_id });
                    setShowAssigneePicker(false);
                  }}
                  className={`flex items-center gap-2 px-2 h-7 rounded-md text-[12px] font-medium active:scale-95 ${
                    isCurrent ? 'bg-slate-100 dark:bg-slate-700' : ''
                  }`}
                  style={{ color: m.color || '#94a3b8' }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color || '#94a3b8' }} />
                  {m.display_name}
                </button>
              );
            })}
            <button
              data-testid={`assignee-pick-both-${todo.id}`}
              onClick={(e) => {
                e.stopPropagation();
                updateTodo(todo.id, { assigned_to: null });
                setShowAssigneePicker(false);
              }}
              className={`flex items-center gap-2 px-2 h-7 rounded-md text-[12px] font-medium active:scale-95 ${
                !todo.assigned_to ? 'bg-slate-100 dark:bg-slate-700' : ''
              }`}
              style={{ color: '#64748B' }}
            >
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Beide
            </button>
          </div>
        )}

        <div className="pl-5 pr-4 py-4 flex items-center gap-4">
          <button
            data-testid={`todo-toggle-${todo.id}`}
            onClick={(e) => { e.stopPropagation(); if (!swipeOpen) toggleTodo(todo.id); }}
            aria-label={todo.completed ? 'Als offen markieren' : 'Als erledigt markieren'}
            className={`shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center active:scale-90 transition-transform ${
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
                  className="flex-1 min-w-0 text-[17px] leading-normal text-slate-900 dark:text-slate-50 bg-slate-50 dark:bg-slate-800 px-2 py-1 pr-20 -mx-2 -my-1 rounded outline-none focus:ring-2 focus:ring-blue-400"
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
                  className={`flex-1 min-w-0 text-[17px] leading-normal text-slate-900 dark:text-slate-50 cursor-text pr-20 line-clamp-2 ${
                    todo.completed ? 'line-through' : ''
                  }`}
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  {todo.title}
                </p>
              )}
            </div>

            {todo.comment && !editingComment && (
              <div className="mt-0.5 pr-20">
                <p
                  ref={commentRef}
                  data-testid={`todo-comment-display-${todo.id}`}
                  onClick={(e) => {
                    if (swipeOpen) return;
                    e.stopPropagation();
                    if (commentOverflows && !commentExpanded) {
                      setCommentExpanded(true);
                    } else {
                      setEditingComment(true);
                    }
                  }}
                  className={`text-[13px] leading-snug text-slate-500 dark:text-slate-400 whitespace-pre-wrap cursor-text ${
                    commentExpanded ? '' : 'line-clamp-2'
                  }`}
                >
                  {todo.comment}
                </p>
                {(commentOverflows || commentExpanded) && (
                  <button
                    type="button"
                    data-testid={`todo-comment-action-${todo.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (commentExpanded) setEditingComment(true);
                      else setCommentExpanded(true);
                    }}
                    className="text-[11px] text-slate-400 dark:text-slate-500 font-medium active:opacity-60 mt-0.5"
                  >
                    {commentExpanded ? 'Bearbeiten' : '… mehr'}
                  </button>
                )}
              </div>
            )}
            {editingComment && (
              <div className="pr-20">
                <textarea
                  data-testid={`todo-comment-${todo.id}`}
                  value={commentValue}
                  onChange={(e) => setCommentValue(e.target.value)}
                  onBlur={() => { handleCommentSave(); setEditingComment(false); setCommentExpanded(false); }}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  placeholder="Kommentar hinzufügen…"
                  rows={2}
                  className="w-full mt-1 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {quickDone && (
                <span
                  data-testid={`todo-quickdone-${todo.id}`}
                  className="text-sm leading-none select-none"
                  title="Schnell erledigt"
                  aria-label="Schnell erledigt"
                >
                  ⚡
                </span>
              )}
              {todo.completed && todo.completed_at && (
                <span
                  data-testid={`todo-completed-stamp-${todo.id}`}
                  className="inline-flex items-center gap-1 px-1.5 h-5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                >
                  <Check className="w-3 h-3" />
                  {relativeCompletedDE(todo.completed_at)}
                </span>
              )}
              {!todo.completed && todo.due_date && !editingDue && (
                <button
                  type="button"
                  data-testid={`todo-due-${todo.id}`}
                  onClick={(e) => {
                    if (swipeOpen) return;
                    e.stopPropagation();
                    setEditingDue(true);
                  }}
                  className={`inline-flex items-center gap-1 px-1.5 h-5 rounded-md text-[11px] font-medium active:opacity-70 ${
                    overdue
                      ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300'
                      : dueToday
                      ? 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  {formatDueDateDE(todo.due_date)}
                </button>
              )}
              {editingDue && (
                <div className="w-full flex flex-col gap-1.5 mt-1" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      data-testid={`todo-due-quick-today-${todo.id}`}
                      onClick={() => setQuickDate(0)}
                      className="px-2 h-6 rounded-md text-[11px] font-medium bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 active:opacity-70"
                    >
                      Heute
                    </button>
                    <button
                      type="button"
                      data-testid={`todo-due-quick-tomorrow-${todo.id}`}
                      onClick={() => setQuickDate(1)}
                      className="px-2 h-6 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 active:opacity-70"
                    >
                      Morgen
                    </button>
                    <button
                      type="button"
                      data-testid={`todo-due-quick-week-${todo.id}`}
                      onClick={setNextMonday}
                      className="px-2 h-6 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 active:opacity-70"
                    >
                      Nächste Woche
                    </button>
                  </div>
                  <input
                    type="datetime-local"
                    data-testid={`todo-due-edit-${todo.id}`}
                    autoFocus
                    value={toDatetimeLocal(todo.due_date)}
                    onChange={handleDueChange}
                    className="h-7 px-2 rounded-md text-[11px] font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-400 self-start"
                  />
                </div>
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
              {isSenderOfNudge && (
                <span className="inline-flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 italic">in {nudgeCooldown}h wieder</span>
                  <button
                    data-testid={`todo-nudge-undo-${todo.id}`}
                    onClick={(e) => { e.stopPropagation(); if (!swipeOpen) undoNudge(todo.id); }}
                    className="text-[14px] leading-none text-slate-400 hover:text-red-500 active:scale-90 w-7 h-7 flex items-center justify-center -my-1"
                    aria-label="Anstoss zurückziehen"
                  >
                    ×
                  </button>
                </span>
              )}
              {isReceiverOfNudge && (
                <button
                  data-testid={`todo-nudge-ack-${todo.id}`}
                  onClick={(e) => { e.stopPropagation(); if (!swipeOpen) acknowledgeNudge(todo.id); }}
                  className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 active:scale-95"
                >
                  <Check className="w-3 h-3" />
                  Alles klar
                </button>
              )}
              {canNudge && !isSenderOfNudge && (
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
              {nudgeError && <span className="text-[10px] text-red-500">{nudgeError}</span>}
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
