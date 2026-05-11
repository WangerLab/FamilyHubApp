import React from 'react';
import { Check } from 'lucide-react';

const DOT_COLORS = {
  tim: '#EC4899',
  iris: '#2563EB',
  both: '#94A3B8',
};

export default function MicrotaskRow({ task, onToggle }) {
  const dotColor = DOT_COLORS[task.suggested_for] || null;

  return (
    <div
      data-testid={`microtask-row-${task.id}`}
      className="flex items-start gap-3 py-2"
    >
      <button
        onClick={() => onToggle(task)}
        aria-label={task.completed ? 'Aufgabe als offen markieren' : 'Aufgabe abhaken'}
        className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 active:opacity-70 ${
          task.completed
            ? 'bg-rose-500 border-rose-500'
            : 'border-slate-300 dark:border-slate-600 bg-transparent'
        }`}
      >
        {task.completed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </button>

      <div className="flex-1 min-w-0 flex items-center gap-2">
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
              : 'text-slate-900 dark:text-slate-50'
          }`}
        >
          {task.title}
        </span>
      </div>
    </div>
  );
}
