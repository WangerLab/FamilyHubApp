import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Lock } from 'lucide-react';
import { getBlockingTasks } from '../../lib/projectDependencies';

const DOT_COLORS = {
  tim: '#EC4899',
  iris: '#2563EB',
  both: '#94A3B8',
};

export default function MicrotaskRow({ task, onToggle, allMicrotasks, projectId }) {
  const navigate = useNavigate();
  const dotColor = DOT_COLORS[task.suggested_for] || null;
  const blocking = getBlockingTasks(task, allMicrotasks || []);
  const isBlocked = blocking.length > 0 && !task.completed;

  return (
    <div
      data-testid={`microtask-row-${task.id}`}
      className="flex items-start gap-3 py-2"
    >
      <button
        onClick={() => !isBlocked && onToggle(task)}
        disabled={isBlocked}
        aria-label={
          isBlocked
            ? `Geblockt durch: ${blocking.map((b) => b.title).join(', ')}`
            : task.completed
            ? 'Aufgabe als offen markieren'
            : 'Aufgabe abhaken'
        }
        className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
          task.completed
            ? 'bg-rose-500 border-rose-500 active:opacity-70'
            : isBlocked
            ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 cursor-not-allowed'
            : 'border-slate-300 dark:border-slate-600 bg-transparent active:opacity-70'
        }`}
      >
        {task.completed ? (
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        ) : isBlocked ? (
          <Lock className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500" />
        ) : null}
      </button>

      <button
        type="button"
        onClick={() => projectId && navigate(`/projects/${projectId}/microtask/${task.id}`)}
        className="flex-1 min-w-0 text-left active:opacity-70"
        aria-label={`Details zu ${task.title} anzeigen`}
      >
        <div className="flex items-center gap-2">
          {dotColor && (
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: dotColor }}
              aria-hidden="true"
            />
          )}
          <span
            className={`text-sm truncate ${
              task.completed
                ? 'text-slate-400 dark:text-slate-500 line-through'
                : isBlocked
                ? 'text-slate-400 dark:text-slate-500'
                : 'text-slate-900 dark:text-slate-50'
            }`}
          >
            {task.title}
          </span>
        </div>
        {isBlocked && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
            wartet auf: {blocking.map((b) => b.title).join(', ')}
          </p>
        )}
      </button>
    </div>
  );
}
