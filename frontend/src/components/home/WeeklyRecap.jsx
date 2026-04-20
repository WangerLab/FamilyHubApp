import React, { useMemo } from 'react';
import { Trophy, Sparkles } from 'lucide-react';
import { useActivity } from '../../contexts/ActivityContext';
import { useTodos } from '../../contexts/TodosContext';
import { useChores } from '../../contexts/ChoresContext';

/**
 * Weekly Family Recap — a friendly card aggregating the last 7 days of activity.
 * Shown at the bottom of the dashboard. Uses only data already in context
 * (activity_log + todos + chore_completions) — no new queries.
 */
export default function WeeklyRecap() {
  const { entries = [], memberMap = {} } = useActivity() || {};
  const { todos = [], houseMembers = [] } = useTodos() || {};
  const { completions = [] } = useChores() || {};

  const stats = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

    // Todos completed per user in last 7 days
    const todosByUser = {};
    houseMembers.forEach((m) => { todosByUser[m.user_id] = 0; });
    todos.forEach((t) => {
      if (t.completed && t.completed_at && new Date(t.completed_at) >= weekAgo && t.completed_by) {
        todosByUser[t.completed_by] = (todosByUser[t.completed_by] || 0) + 1;
      }
    });

    // Chore completions per user
    const choresByUser = {};
    completions.forEach((c) => {
      if (new Date(c.completed_at) >= weekAgo && c.completed_by) {
        choresByUser[c.completed_by] = (choresByUser[c.completed_by] || 0) + 1;
      }
    });

    // Grocery/misc adds & checks (from activity_log)
    let shoppingAdds = 0;
    let shoppingChecks = 0;
    entries.forEach((e) => {
      if (new Date(e.created_at) < weekAgo) return;
      if (e.action_type === 'grocery_add' || e.action_type === 'misc_add') shoppingAdds += 1;
      if (e.action_type === 'grocery_check' || e.action_type === 'misc_check') shoppingChecks += 1;
    });

    const totalTodos = Object.values(todosByUser).reduce((a, b) => a + b, 0);
    const totalChores = Object.values(choresByUser).reduce((a, b) => a + b, 0);
    const anyActivity = totalTodos + totalChores + shoppingAdds + shoppingChecks > 0;

    // Top performer (for trophy)
    let topUserId = null;
    let topCount = 0;
    houseMembers.forEach((m) => {
      const c = (todosByUser[m.user_id] || 0) + (choresByUser[m.user_id] || 0);
      if (c > topCount) { topCount = c; topUserId = m.user_id; }
    });

    return {
      todosByUser, choresByUser,
      totalTodos, totalChores,
      shoppingAdds, shoppingChecks,
      anyActivity,
      topUser: topUserId ? memberMap[topUserId] || houseMembers.find((m) => m.user_id === topUserId) : null,
      topCount,
    };
  }, [entries, todos, completions, houseMembers, memberMap]);

  if (houseMembers.length === 0) return null;

  // Cheerful closer lines vary slightly with activity volume
  const totalActions = stats.totalTodos + stats.totalChores + stats.shoppingAdds + stats.shoppingChecks;
  const mood =
    totalActions >= 30 ? 'Wow, eine produktive Woche! 🚀' :
    totalActions >= 15 ? 'Solide Woche zusammen. 💪' :
    totalActions >= 5  ? 'Läuft bei euch. 🌱' :
                         'Jeder Start zählt. ✨';

  return (
    <div
      data-testid="weekly-recap-card"
      className="rounded-2xl p-4 shadow-md border bg-gradient-to-br from-amber-50 via-rose-50 to-sky-50 dark:from-amber-950/30 dark:via-rose-950/30 dark:to-sky-950/30 border-amber-200 dark:border-amber-900/50"
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-amber-500" />
        <p
          className="text-[11px] uppercase tracking-wide font-bold text-amber-700 dark:text-amber-400"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Wochen-Rückblick
        </p>
      </div>

      {/* Headline */}
      <p
        className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 mb-3 leading-snug"
        style={{ fontFamily: 'Manrope, sans-serif' }}
      >
        {stats.anyActivity && stats.topUser ? (
          <>
            <Trophy className="inline w-4 h-4 text-amber-500 mr-1 -mt-0.5" />
            <span style={{ color: stats.topUser.color }}>{stats.topUser.display_name}</span>{' '}
            führt mit <span className="font-bold">{stats.topCount}</span> Erledigungen
          </>
        ) : stats.anyActivity ? (
          <>Diese Woche in Zahlen</>
        ) : (
          <>Diese Woche noch ruhig 🌿</>
        )}
      </p>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {houseMembers.map((m) => {
          const count = (stats.todosByUser[m.user_id] || 0) + (stats.choresByUser[m.user_id] || 0);
          return (
            <div
              key={m.user_id}
              data-testid={`recap-user-${m.user_id}`}
              className="rounded-lg bg-white/70 dark:bg-slate-900/50 px-3 py-2 backdrop-blur-sm"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{m.display_name}</span>
              </div>
              <p className="text-lg font-bold tabular-nums mt-0.5" style={{ color: m.color, fontFamily: 'Manrope, sans-serif' }}>
                {count}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {stats.todosByUser[m.user_id] || 0} Todos · {stats.choresByUser[m.user_id] || 0} Chores
              </p>
            </div>
          );
        })}
      </div>

      {(stats.shoppingAdds + stats.shoppingChecks) > 0 && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3">
          🛒 {stats.shoppingAdds} Artikel hinzugefügt · {stats.shoppingChecks} abgehakt
        </p>
      )}

      <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200 mt-3 italic">
        {stats.anyActivity ? mood : 'Tag für Tag ein Stück weiter. ✨'}
      </p>
    </div>
  );
}
