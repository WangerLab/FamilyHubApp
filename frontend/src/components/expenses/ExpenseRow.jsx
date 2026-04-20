import React from 'react';
import { Trash2, ArrowRightLeft } from 'lucide-react';
import { useExpenses } from '../../contexts/ExpensesContext';

function fmtEUR(n) {
  return Number(n || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

export default function ExpenseRow({ expense }) {
  const { deleteExpense, memberColorMap, memberNameMap } = useExpenses();
  const color = memberColorMap[expense.paid_by] || '#94a3b8';
  const name = memberNameMap[expense.paid_by] || '—';

  return (
    <div
      data-testid={`expense-row-${expense.id}`}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${expense.is_settlement ? '' : ''}`}
        style={{ backgroundColor: `${color}20`, color }}
      >
        {expense.is_settlement ? <ArrowRightLeft className="w-4 h-4" /> : (
          <span className="text-[11px] font-bold tabular-nums">€</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-[14px] font-medium text-slate-900 dark:text-slate-50 truncate leading-tight ${expense.is_settlement ? 'italic' : ''}`}
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          {expense.description}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
            {fmtDate(expense.expense_date)}
          </span>
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium"
            style={{ color }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            {name}
          </span>
          {expense.category && (
            <span className="text-[10px] px-1.5 h-4 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center">
              {expense.category}
            </span>
          )}
        </div>
      </div>
      <p
        className={`text-[15px] font-bold tabular-nums shrink-0 ${expense.is_settlement ? 'italic' : ''}`}
        style={{ color, fontFamily: 'Manrope, sans-serif' }}
      >
        {fmtEUR(expense.amount)}
      </p>
      <button
        data-testid={`expense-delete-${expense.id}`}
        onClick={() => deleteExpense(expense.id)}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 dark:text-slate-600 active:bg-slate-100 dark:active:bg-slate-800 shrink-0"
        aria-label="Löschen"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
