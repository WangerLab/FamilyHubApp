import React from 'react';
import { Trophy } from 'lucide-react';
import { useTodos } from '../../contexts/TodosContext';
import { useChores } from '../../contexts/ChoresContext';

/**
 * Weekly gamification bar. Shows completed-count per member with a trophy for the leader.
 * Props:
 *   source: 'todos' | 'chores'
 */
export default function WeeklyStats({ source }) {
  const todos = useTodos();
  const chores = useChores();
  const ctx = source === 'chores' ? chores : todos;
  if (!ctx) return null;
  const stats = ctx.weeklyStats || {};
  const members = ctx.houseMembers || [];
  if (members.length === 0) return null;

  const entries = members.map((m) => ({
    ...m,
    count: stats[m.user_id] || 0,
  }));
  const max = Math.max(...entries.map((e) => e.count));
  const hasActivity = max > 0;

  return (
    <div
      data-testid={`weekly-stats-${source}`}
      className="mt-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Trophy className={`w-3.5 h-3.5 ${hasActivity ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`} />
        <p
          className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Diese Woche erledigt
        </p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {entries.map((e) => (
          <div
            key={e.user_id}
            data-testid={`stat-${source}-${e.user_id}`}
            className="flex items-center gap-1.5"
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: e.color }}
            />
            <span
              className="text-sm font-semibold text-slate-700 dark:text-slate-200"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {e.display_name}
            </span>
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: e.color }}
            >
              {e.count}
            </span>
            {hasActivity && e.count === max && e.count > 0 && (
              <span className="text-sm" title="Top">🏆</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
