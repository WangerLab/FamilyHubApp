import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Lock, Trash2 } from 'lucide-react';
import { getBlockingTasks } from '../../lib/projectDependencies';
import { useProjects } from '../../contexts/ProjectsContext';

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

  const { softDeleteMicrotaskWithUndo } = useProjects();
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

  return (
    <div
      data-testid={`microtask-row-${task.id}`}
      className="relative overflow-hidden"
    >
      <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-red-500">
        <button
          data-testid={`microtask-delete-${task.id}`}
          onClick={() => { setSwipeOpen(false); softDeleteMicrotaskWithUndo(task.id); }}
          className="w-full h-full flex flex-col items-center justify-center gap-1 active:opacity-70"
          aria-label="Löschen"
        >
          <Trash2 className="w-5 h-5 text-white" />
          <span className="text-[9px] text-white font-medium">Löschen</span>
        </button>
      </div>

      <div
        className="relative bg-white dark:bg-slate-900 flex items-start gap-3 py-2 transition-transform duration-200 ease-out"
        style={{ transform: swipeOpen ? 'translateX(-80px)' : 'translateX(0)' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
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
          onClick={() => {
            if (swipeOpen) { setSwipeOpen(false); return; }
            if (projectId) navigate(`/projects/${projectId}/microtask/${task.id}`);
          }}
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
    </div>
  );
}
