import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useExpenses } from '../../contexts/ExpensesContext';
import { useAuth } from '../../contexts/AuthContext';

const CATEGORIES = ['Essen', 'Haushalt', 'Transport', 'Unterhaltung', 'Sonstiges'];

function toDateInput(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function AddExpenseInput({ prefill, onCancel }) {
  const { addExpense, houseMembers } = useExpenses();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(!!prefill);
  const [description, setDescription] = useState(prefill?.description || '');
  const [amount, setAmount] = useState(prefill?.amount ? String(prefill.amount.toFixed(2)).replace('.', ',') : '');
  const [paidBy, setPaidBy] = useState(prefill?.paid_by || user?.id || '');
  const [category, setCategory] = useState(prefill?.category || '');
  const [date, setDate] = useState(toDateInput());
  const [isSettlement] = useState(!!prefill?.is_settlement);
  const [busy, setBusy] = useState(false);

  const canSubmit = !busy && description.trim() && Number(amount.replace(',', '.')) > 0 && paidBy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    await addExpense({
      description: description.trim(),
      amount: Number(amount.replace(',', '.')),
      paid_by: paidBy,
      expense_date: date,
      category: category || null,
      is_settlement: isSettlement,
    });
    setDescription(''); setAmount(''); setCategory(''); setDate(toDateInput());
    setBusy(false); setExpanded(false);
    onCancel?.();
  };

  if (!expanded) {
    return (
      <button
        data-testid="add-expense-expand"
        onClick={() => setExpanded(true)}
        className="w-full flex items-center gap-2 h-12 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 px-3 active:opacity-70"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          Neue Ausgabe
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 space-y-2 shadow-sm">
      {isSettlement && (
        <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-500">
          Ausgleichsbuchung
        </div>
      )}
      <input
        data-testid="add-expense-description"
        autoFocus={!isSettlement}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Beschreibung (z.B. Wocheneinkauf Rewe)"
        className="w-full h-11 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:outline-none text-[15px]"
        style={{ fontFamily: 'DM Sans, sans-serif' }}
      />
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            data-testid="add-expense-amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d,.]/g, ''))}
            placeholder="0,00"
            className="w-full h-11 pl-3 pr-8 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:outline-none text-[15px] font-semibold tabular-nums"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">€</span>
        </div>
        <input
          data-testid="add-expense-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-11 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400 mr-1">
          Bezahlt von:
        </p>
        {houseMembers.map((m) => (
          <button
            key={m.user_id}
            data-testid={`paidby-${m.user_id}`}
            onClick={() => setPaidBy(m.user_id)}
            className={`h-8 pl-1.5 pr-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              paidBy === m.user_id ? 'ring-2 ring-offset-1' : 'opacity-60'
            }`}
            style={{
              backgroundColor: `${m.color}18`,
              color: m.color,
              '--tw-ring-color': m.color,
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
            {m.display_name}
          </button>
        ))}
      </div>

      {!isSettlement && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              data-testid={`expense-cat-${c}`}
              onClick={() => setCategory(category === c ? '' : c)}
              className={`h-7 px-2.5 rounded-full text-[11px] font-medium transition-all ${
                category === c
                  ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          data-testid="add-expense-cancel"
          onClick={() => { setExpanded(false); onCancel?.(); }}
          className="flex-1 h-10 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium active:bg-slate-50 dark:active:bg-slate-800"
        >
          Abbrechen
        </button>
        <button
          data-testid="add-expense-submit"
          onClick={submit}
          disabled={!canSubmit}
          className="flex-[1.5] h-10 rounded-lg bg-blue-500 text-white text-sm font-semibold active:scale-[0.98] disabled:opacity-40"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Hinzufügen
        </button>
      </div>
    </div>
  );
}
