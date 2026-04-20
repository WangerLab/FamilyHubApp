import React from 'react';
import { Check, Trash2, Undo2 } from 'lucide-react';
import { useChores } from '../../contexts/ChoresContext';
import { useAuth } from '../../contexts/AuthContext';

const FREQ_LABEL = {
  '1x_week': 'diese Woche',
  '2x_week': 'diese Woche',
  '1x_month': 'diesen Monat',
  'custom': 'im Zeitraum',
};

export default function ChoreCard({ chore }) {
  const { user } = useAuth();
  const {
    periodCompletions, targetCount, logCompletion, undoCompletion,
    deleteChore, memberColorMap, memberNameMap,
  } = useChores();

  const completions = periodCompletions(chore);
  const target = targetCount(chore);
  const done = completions.length;
  const full = target > 0 && done >= target;
  const mineThisPeriod = completions.find((c) => c.completed_by === user?.id);
  const progressPct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 100;

  return (
    <div
      data-testid={`chore-card-${chore.id}`}
      className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 space-y-2"
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className="text-[15px] font-semibold text-slate-900 dark:text-slate-50"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              {chore.title}
            </h3>
            {full && <span className="text-xs" title="erledigt">✅</span>}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {done}/{target} {FREQ_LABEL[chore.reset_frequency] || 'im Zeitraum'}
            {chore.reset_frequency === 'custom' && chore.custom_days ? ` (alle ${chore.custom_days}T)` : ''}
          </p>
        </div>
        <button
          data-testid={`chore-delete-${chore.id}`}
          onClick={() => deleteChore(chore.id)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 dark:text-slate-600 active:bg-slate-100 dark:active:bg-slate-800 shrink-0"
          aria-label="Chore löschen"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          data-testid={`chore-progress-${chore.id}`}
          className="h-full transition-all duration-300"
          style={{
            width: `${progressPct}%`,
            backgroundColor: full ? '#22C55E' : '#3B82F6',
          }}
        />
      </div>

      {/* Completion dots + action */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap min-h-[28px]">
          {completions.length === 0 ? (
            <span className="text-[11px] text-slate-400 dark:text-slate-600">Noch nicht erledigt</span>
          ) : (
            completions.map((c) => {
              const color = memberColorMap[c.completed_by] || '#94a3b8';
              const name = memberNameMap[c.completed_by] || '—';
              return (
                <div
                  key={c.id}
                  data-testid={`completion-dot-${c.id}`}
                  className="flex items-center gap-1 h-6 pl-1 pr-2 rounded-full text-[11px] font-medium"
                  style={{ backgroundColor: `${color}18`, color }}
                  title={`${name} · ${new Date(c.completed_at).toLocaleDateString('de-DE')}`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  {name}
                </div>
              );
            })
          )}
        </div>
        {mineThisPeriod ? (
          <button
            data-testid={`chore-undo-${chore.id}`}
            onClick={() => undoCompletion(mineThisPeriod.id)}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold active:scale-95"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Rückgängig
          </button>
        ) : (
          <button
            data-testid={`chore-complete-${chore.id}`}
            onClick={() => logCompletion(chore.id)}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-blue-500 text-white text-xs font-semibold active:scale-95 shadow-sm shadow-blue-500/30"
          >
            <Check className="w-3.5 h-3.5" />
            Erledigt
          </button>
        )}
      </div>
    </div>
  );
}
