import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Archive, Wallet, ChevronDown, ChevronRight } from 'lucide-react';
import { useExpenses } from '../../contexts/ExpensesContext';
import BalanceCard from '../expenses/BalanceCard';
import AddExpenseInput from '../expenses/AddExpenseInput';
import ExpenseRow from '../expenses/ExpenseRow';
import BrainDump from '../grocery/BrainDump';

function fmtMonthLabel(monthKey) {
  // "2026-04" → "April 2026"
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
}

function fmtEUR(n) {
  return Number(n || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

export default function ExpensesTab() {
  const navigate = useNavigate();
  const {
    expenses, loading,
    currentMonth, sumAllUsersThisMonth,
    balance, archive,
    archiveCurrentMonth,
  } = useExpenses();

  const [settlementPrefill, setSettlementPrefill] = useState(null);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showArchiveList, setShowArchiveList] = useState(false);

  const orderedExpenses = useMemo(
    () => [...expenses].sort((a, b) => {
      // newest first; settlements float to top when same day
      const dateDiff = new Date(b.expense_date) - new Date(a.expense_date);
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.created_at) - new Date(a.created_at);
    }),
    [expenses]
  );

  const onSettle = ({ from, to, amount }) => {
    setSettlementPrefill({
      description: 'Ausgleich',
      amount: Number(amount),
      paid_by: from,
      is_settlement: true,
    });
  };

  return (
    <div data-testid="expenses-tab" className="space-y-3 pb-4">
      {/* Header */}
      <div className="flex items-center gap-2 pt-2">
        <button
          data-testid="expenses-back"
          onClick={() => navigate('/more')}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-800"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2
            className="text-xl font-bold text-slate-900 dark:text-slate-50 leading-tight"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Ausgaben
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {fmtMonthLabel(currentMonth)} · Gesamt {fmtEUR(sumAllUsersThisMonth)}
          </p>
        </div>
        {expenses.length > 0 && (
          <button
            data-testid="expenses-archive-month"
            onClick={() => setShowArchiveDialog(true)}
            aria-label="Monat archivieren"
            className="h-9 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold active:scale-95 inline-flex items-center gap-1.5"
          >
            <Archive className="w-3.5 h-3.5" />
            Archivieren
          </button>
        )}
      </div>

      <BalanceCard onSettle={onSettle} />

      {settlementPrefill ? (
        <AddExpenseInput prefill={settlementPrefill} onCancel={() => setSettlementPrefill(null)} />
      ) : (
        <AddExpenseInput />
      )}

      <BrainDump mode="expense" />

      {/* Expense list */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-6 h-6 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-blue-500 animate-spin" />
        </div>
      ) : orderedExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center mb-3">
            <Wallet className="w-7 h-7 text-slate-300 dark:text-slate-600" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Noch keine Ausgaben</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[240px]">
            Trage deine erste Ausgabe diesen Monat ein.
          </p>
        </div>
      ) : (
        <div data-testid="expenses-list" className="space-y-1.5">
          {orderedExpenses.map((e) => <ExpenseRow key={e.id} expense={e} />)}
        </div>
      )}

      {/* Archive list collapsible */}
      {archive.length > 0 && (
        <div className="pt-3">
          <button
            data-testid="toggle-archive-list"
            onClick={() => setShowArchiveList((v) => !v)}
            className="w-full flex items-center gap-2 h-9 px-2 text-sm font-semibold text-slate-500 dark:text-slate-400 active:opacity-70"
          >
            {showArchiveList ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Archive className="w-3.5 h-3.5" />
            <span style={{ fontFamily: 'Manrope, sans-serif' }}>Archiv</span>
            <span className="text-xs font-medium text-slate-400">({archive.length})</span>
          </button>
          {showArchiveList && (
            <div className="space-y-1.5 mt-1">
              {archive.map((a) => (
                <div
                  key={a.id}
                  data-testid={`archive-row-${a.id}`}
                  className="rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {fmtMonthLabel(a.month_key)}
                    </p>
                    <p className="text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                      {new Date(a.archived_at).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Übertrag: <span className="font-semibold">{fmtEUR(a.balance_carried_over)}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showArchiveDialog && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowArchiveDialog(false)} />
          <div className="fixed inset-x-4 z-50 top-1/2 -translate-y-1/2 max-w-[380px] mx-auto bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {fmtMonthLabel(currentMonth)} archivieren?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Die Monats-Summen werden gespeichert. Offener Saldo ({balance?.quitt ? fmtEUR(0) : fmtEUR(balance.amount)}) wird in den nächsten Monat übertragen. Die Ausgaben bleiben in der Datenbank.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowArchiveDialog(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium text-sm active:bg-slate-50 dark:active:bg-slate-800"
              >
                Abbrechen
              </button>
              <button
                data-testid="expenses-archive-confirm"
                onClick={async () => { await archiveCurrentMonth(); setShowArchiveDialog(false); }}
                className="flex-1 h-11 rounded-xl bg-blue-500 text-white font-semibold text-sm active:scale-[0.97]"
              >
                Archivieren
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
