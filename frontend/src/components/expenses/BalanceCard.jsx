import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useExpenses } from '../../contexts/ExpensesContext';

function fmtEUR(n) {
  return Number(n || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

export default function BalanceCard({ onSettle }) {
  const { balance, houseMembers, memberColorMap, memberNameMap, totals, currentMonthCarryOver } = useExpenses() || {};
  if (!houseMembers?.length) return null;

  const isQuitt = balance?.quitt;
  const owedByName = balance?.owed_by ? memberNameMap[balance.owed_by] : null;
  const owedToName = balance?.owed_to ? memberNameMap[balance.owed_to] : null;
  const owedToColor = balance?.owed_to ? memberColorMap[balance.owed_to] : '#3B82F6';

  return (
    <div
      data-testid="balance-card"
      className="rounded-2xl p-5 shadow-lg border"
      style={{
        backgroundColor: isQuitt ? '#f0fdf4' : `${owedToColor}08`,
        borderColor: isQuitt ? '#bbf7d0' : `${owedToColor}30`,
      }}
    >
      {isQuitt ? (
        <div className="text-center py-2">
          <div className="text-3xl mb-1">🎉</div>
          <p
            className="text-xl font-bold text-green-700"
            style={{ fontFamily: 'Manrope, sans-serif' }}
            data-testid="balance-quitt"
          >
            Ihr seid quitt!
          </p>
          <p className="text-xs text-green-600 mt-1">Keine offenen Beträge.</p>
        </div>
      ) : (
        <div>
          <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400">
            Aktueller Saldo
          </p>
          <p
            className="text-2xl font-black mt-1 leading-tight"
            style={{ color: owedToColor, fontFamily: 'Manrope, sans-serif' }}
            data-testid="balance-amount"
          >
            <span className="font-semibold">{owedByName}</span>{' '}
            <span className="opacity-60 font-medium">schuldet</span>{' '}
            <span className="font-semibold">{owedToName}</span>
          </p>
          <p
            className="text-3xl font-black mt-1 tabular-nums"
            style={{ color: owedToColor, fontFamily: 'Manrope, sans-serif' }}
          >
            {fmtEUR(balance.amount)}
          </p>
          {onSettle && (
            <button
              data-testid="settlement-button"
              onClick={() => onSettle({
                from: balance.owed_by,
                to: balance.owed_to,
                amount: balance.amount,
              })}
              className="mt-3 inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold text-white active:scale-[0.98] transition-transform shadow-md"
              style={{ backgroundColor: owedToColor, boxShadow: `0 4px 14px ${owedToColor}40` }}
            >
              <ArrowRight className="w-4 h-4" />
              Ausgleichen ({fmtEUR(balance.amount)})
            </button>
          )}
        </div>
      )}

      {/* Per-member totals */}
      <div className="mt-4 pt-4 border-t flex items-center gap-4 flex-wrap text-xs" style={{ borderColor: isQuitt ? '#bbf7d0' : `${owedToColor}20` }}>
        {houseMembers.map((m) => (
          <div key={m.user_id} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
            <span className="text-slate-600 dark:text-slate-300 font-medium">{m.display_name}</span>
            <span className="text-slate-500 dark:text-slate-400 tabular-nums">
              {fmtEUR(totals[m.user_id] || 0)}
            </span>
          </div>
        ))}
      </div>

      {currentMonthCarryOver ? (
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          inkl. Übertrag aus Vormonat: {fmtEUR(currentMonthCarryOver)}
        </p>
      ) : null}
    </div>
  );
}
