import React, { useMemo, useState } from 'react';
import { CheckSquare, ChevronDown, ChevronRight, Archive } from 'lucide-react';
import { useTodos } from '../../contexts/TodosContext';
import { useAuth } from '../../contexts/AuthContext';
import AddTodoInput from '../tasks/AddTodoInput';
import TodoRow from '../tasks/TodoRow';
import NudgeToast from '../tasks/NudgeToast';

function EmptyState({ color }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 shadow-lg"
        style={{ backgroundColor: `${color}15`, border: `2px solid ${color}30` }}
      >
        <CheckSquare className="w-10 h-10" style={{ color: `${color}80` }} strokeWidth={1.5} />
      </div>
      <h3
        className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2"
        style={{ fontFamily: 'Manrope, sans-serif' }}
      >
        Keine offenen Tasks
      </h3>
      <p className="text-sm text-slate-400 dark:text-slate-500 max-w-[260px]">
        Was steht an? Tippe oben auf „Neuer Task" und leg los.
      </p>
    </div>
  );
}

export default function TasksTab() {
  const { member } = useAuth();
  const { activeTodos, completedTodos, archivedTodos, loading, overdueCount, pendingDelete, undoDelete } = useTodos();
  const [showCompleted, setShowCompleted] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const color = member?.color || '#3B82F6';

  // Sort active: overdue first, then by due_date asc (nulls last), then created desc
  const sortedActive = useMemo(() => {
    return [...activeTodos].sort((a, b) => {
      const aOv = a.due_date && new Date(a.due_date) < new Date();
      const bOv = b.due_date && new Date(b.due_date) < new Date();
      if (aOv !== bOv) return aOv ? -1 : 1;
      if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [activeTodos]);

  return (
    <div data-testid="tasks-tab" className="space-y-3 pb-4">
      <NudgeToast />

      {/* Header */}
      <div className="flex items-center justify-between pt-2 pb-1">
        <div className="flex items-center gap-2">
          <h2
            className="text-xl font-bold text-slate-900 dark:text-slate-50"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Tasks
          </h2>
          {activeTodos.length > 0 && (
            <span
              data-testid="active-count-badge"
              className="min-w-[20px] h-5 px-1.5 rounded-full text-white text-[11px] font-bold flex items-center justify-center"
              style={{ backgroundColor: color }}
            >
              {activeTodos.length}
            </span>
          )}
          {overdueCount > 0 && (
            <span
              data-testid="overdue-badge"
              className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center"
              title="Überfällig"
            >
              !{overdueCount}
            </span>
          )}
        </div>
      </div>

      <AddTodoInput />

      {/* Active list */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-6 h-6 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-blue-500 animate-spin" />
        </div>
      ) : sortedActive.length === 0 ? (
        <EmptyState color={color} />
      ) : (
        <div data-testid="todos-active-list" className="space-y-2 px-1">
          {sortedActive.map((t) => (
            <TodoRow key={t.id} todo={t} />
          ))}
        </div>
      )}

      {/* Completed collapsible */}
      {completedTodos.length > 0 && (
        <div className="pt-3">
          <button
            data-testid="toggle-completed"
            onClick={() => setShowCompleted((v) => !v)}
            className="w-full flex items-center gap-2 h-9 px-2 text-sm font-semibold text-slate-500 dark:text-slate-400 active:opacity-70"
          >
            {showCompleted ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span style={{ fontFamily: 'Manrope, sans-serif' }}>Erledigt</span>
            <span className="text-xs font-medium text-slate-400">({completedTodos.length})</span>
          </button>
          {showCompleted && (
            <div className="space-y-2 px-1 mt-1">
              {completedTodos.map((t) => <TodoRow key={t.id} todo={t} />)}
            </div>
          )}
        </div>
      )}

      {/* Archive collapsible */}
      {archivedTodos.length > 0 && (
        <div className="pt-2">
          <button
            data-testid="toggle-archive"
            onClick={() => setShowArchive((v) => !v)}
            className="w-full flex items-center gap-2 h-9 px-2 text-sm font-semibold text-slate-500 dark:text-slate-400 active:opacity-70"
          >
            {showArchive ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Archive className="w-3.5 h-3.5" />
            <span style={{ fontFamily: 'Manrope, sans-serif' }}>Archiv</span>
            <span className="text-xs font-medium text-slate-400">({archivedTodos.length})</span>
          </button>
          {showArchive && (
            <div className="space-y-2 px-1 mt-1 opacity-80">
              {archivedTodos.map((t) => <TodoRow key={t.id} todo={t} />)}
            </div>
          )}
        </div>
      )}

      {pendingDelete && (
        <UndoSnackbar name={pendingDelete.todo.title} onUndo={undoDelete} />
      )}
    </div>
  );
}

function UndoSnackbar({ name, onUndo }) {
  return (
    <div
      data-testid="undo-snackbar-todo"
      className="fixed z-50 left-3 right-3 sm:max-w-[476px] mx-auto"
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
          data-testid="undo-delete-button-todo"
          onClick={onUndo}
          className="text-sm font-bold text-blue-400 dark:text-blue-600 active:opacity-70 shrink-0"
        >
          Rückgängig
        </button>
      </div>
    </div>
  );
}
