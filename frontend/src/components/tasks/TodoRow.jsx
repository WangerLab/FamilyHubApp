import React, { useState } from 'react';
import { Check, Zap, Bell, MessageSquare, Trash2, Clock } from 'lucide-react';
import { useTodos } from '../../contexts/TodosContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDueDateDE, isOverdue } from '../../utils/smartDate';

const PRIORITY_META = {
  high:   { color: '#EF4444', label: 'Hoch' },
  medium: { color: '#F59E0B', label: 'Mittel' },
  low:    { color: '#22C55E', label: 'Niedrig' },
};

export default function TodoRow({ todo }) {
  const { user } = useAuth();
  const { toggleTodo, updateTodo, softDelete, sendNudge, memberColorMap, memberNameMap } = useTodos();
  const [showComment, setShowComment] = useState(!!todo.comment);
  const [commentValue, setCommentValue] = useState(todo.comment || '');
  const [nudgeBusy, setNudgeBusy] = useState(false);
  const [nudgeError, setNudgeError] = useState('');

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
      {/* Priority stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: prio.color }}
        aria-hidden
      />

      <div className="pl-4 pr-3 py-3 flex items-start gap-3">
        <button
          data-testid={`todo-toggle-${todo.id}`}
          onClick={() => toggleTodo(todo.id)}
          aria-label={todo.completed ? 'Als offen markieren' : 'Als erledigt markieren'}
          className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 active:scale-90 transition-transform ${
            todo.completed
              ? 'bg-slate-200 dark:bg-slate-700 border-slate-200 dark:border-slate-700'
              : 'bg-white dark:bg-slate-900'
          }`}
          style={!todo.completed ? { borderColor: prio.color } : {}}
        >
          {todo.completed && <Check className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1.5">
            <p
              className={`flex-1 min-w-0 text-[15px] leading-snug text-slate-900 dark:text-slate-50 ${
                todo.completed ? 'line-through' : ''
              }`}
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {todo.title}
            </p>
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

          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap mt-1">
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
            <button
              data-testid={`todo-comment-toggle-${todo.id}`}
              onClick={() => setShowComment((v) => !v)}
              className={`p-0.5 rounded transition-colors active:opacity-70 ${
                todo.comment || showComment ? 'text-blue-500' : 'text-slate-300 dark:text-slate-600'
              }`}
              aria-label="Kommentar"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
            {canNudge && (
              <button
                data-testid={`todo-nudge-${todo.id}`}
                onClick={handleNudge}
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

          {showComment && (
            <textarea
              data-testid={`todo-comment-${todo.id}`}
              value={commentValue}
              onChange={(e) => setCommentValue(e.target.value)}
              onBlur={handleCommentSave}
              placeholder="Kommentar hinzufügen…"
              rows={2}
              className="w-full mt-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          )}
        </div>

        <button
          data-testid={`todo-delete-${todo.id}`}
          onClick={() => softDelete(todo.id)}
          aria-label="Löschen"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 dark:text-slate-600 active:bg-slate-100 dark:active:bg-slate-800 shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
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
