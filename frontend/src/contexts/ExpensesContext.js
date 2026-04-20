import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';
import { useActivity } from './ActivityContext';

const ExpensesContext = createContext(null);

export const thisMonthKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

export const ExpensesProvider = ({ children }) => {
  const { member } = useAuth();
  const activity = useActivity();
  const [expenses, setExpenses] = useState([]);
  const [houseMembers, setHouseMembers] = useState([]);
  const [archive, setArchive] = useState([]); // last 12 archived months
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(thisMonthKey());

  // Load member map
  useEffect(() => {
    if (!member?.household_id) return;
    supabase
      .from('household_members')
      .select('user_id, display_name, color')
      .eq('household_id', member.household_id)
      .then(({ data }) => { if (data) setHouseMembers(data); });
  }, [member?.household_id]);

  const fetchMonth = useCallback(async (monthKey = currentMonth) => {
    if (!member?.household_id) return;
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('household_id', member.household_id)
      .eq('month_key', monthKey)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false });
    setExpenses(data || []);
    setLoading(false);
  }, [member?.household_id, currentMonth]);

  const fetchArchive = useCallback(async () => {
    if (!member?.household_id) return;
    const { data } = await supabase
      .from('monthly_balance_archive')
      .select('*')
      .eq('household_id', member.household_id)
      .order('month_key', { ascending: false })
      .limit(12);
    setArchive(data || []);
  }, [member?.household_id]);

  useEffect(() => {
    if (!member?.household_id) { setLoading(false); return; }
    setLoading(true);
    fetchMonth();
    fetchArchive();

    const ch = supabase
      .channel(`expenses:${member.household_id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `household_id=eq.${member.household_id}` },
        (payload) => {
          // Only reflect current-month changes in state
          const row = payload.new || payload.old;
          if (row && row.month_key !== currentMonth) return;
          if (payload.eventType === 'INSERT') {
            setExpenses((prev) => (prev.some((e) => e.id === payload.new.id) ? prev : [payload.new, ...prev]));
          } else if (payload.eventType === 'UPDATE') {
            setExpenses((prev) => prev.map((e) => (e.id === payload.new.id ? payload.new : e)));
          } else if (payload.eventType === 'DELETE') {
            setExpenses((prev) => prev.filter((e) => e.id !== payload.old.id));
          }
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'monthly_balance_archive', filter: `household_id=eq.${member.household_id}` },
        () => { fetchArchive(); })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [member?.household_id, currentMonth, fetchMonth, fetchArchive]);

  const memberColorMap = {};
  const memberNameMap = {};
  houseMembers.forEach((m) => { memberColorMap[m.user_id] = m.color; memberNameMap[m.user_id] = m.display_name; });

  // ---- CRUD ----
  const addExpense = async ({ amount, description, paid_by, expense_date = null, category = null, is_settlement = false }, opts = {}) => {
    if (!member?.household_id || !paid_by) return null;
    const dateStr = expense_date || new Date().toISOString().slice(0, 10);
    const { data: inserted } = await supabase
      .from('expenses')
      .insert({
        household_id: member.household_id,
        paid_by,
        amount: Number(amount) || 0,
        description: (description || '').trim() || (is_settlement ? 'Ausgleich' : 'Ohne Beschreibung'),
        category: category || null,
        expense_date: dateStr,
        month_key: thisMonthKey(new Date(dateStr)),
        is_settlement,
        created_by: member.user_id,
      })
      .select()
      .single();
    if (inserted) {
      if (inserted.month_key === currentMonth) {
        setExpenses((prev) => (prev.some((e) => e.id === inserted.id) ? prev : [inserted, ...prev]));
      }
      if (!opts.silent && activity?.logActivity) {
        const payerName = memberNameMap[paid_by] || member.display_name;
        const amt = Number(inserted.amount).toFixed(2).replace('.', ',');
        const verb = is_settlement ? 'hat einen Ausgleich eingetragen' : 'hat eine Ausgabe eingetragen';
        activity.logActivity({
          action_type: 'expense_add',
          module: 'expenses',
          item_id: inserted.id,
          description: `${payerName} ${verb}: „${inserted.description}" ${amt} €`,
        });
      }
    }
    return inserted;
  };

  const deleteExpense = async (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    await supabase.from('expenses').delete().eq('id', id);
  };

  // ---- Balance logic ----
  // Totals paid per user this month, plus any carried-over balance from prev month's archive
  const currentMonthCarryOver = useMemo(() => {
    // If there's an archive for the previous month, use its balance_carried_over
    const prevMonthKey = (() => {
      const [y, m] = currentMonth.split('-').map(Number);
      const prev = new Date(y, m - 2, 1);
      return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    })();
    const prev = archive.find((a) => a.month_key === prevMonthKey);
    return prev?.balance_carried_over ? Number(prev.balance_carried_over) : 0;
  }, [archive, currentMonth]);

  const totals = useMemo(() => {
    const map = {};
    houseMembers.forEach((m) => { map[m.user_id] = 0; });
    expenses.forEach((e) => {
      if (e.is_settlement) return; // settlements adjust balance, not totals
      map[e.paid_by] = (map[e.paid_by] || 0) + Number(e.amount);
    });
    return map;
  }, [expenses, houseMembers]);

  const settlementSum = useMemo(() => {
    // Settlements: paid_by user sends money to the other. Reduces their "owed" amount.
    // We compute as: settlement from X is equivalent to X having paid X € more toward the 50/50 split.
    // But to keep math simple, we expose a raw "settlement_by_user" map and apply to balance.
    const map = {};
    houseMembers.forEach((m) => { map[m.user_id] = 0; });
    expenses.forEach((e) => {
      if (!e.is_settlement) return;
      map[e.paid_by] = (map[e.paid_by] || 0) + Number(e.amount);
    });
    return map;
  }, [expenses, houseMembers]);

  // Balance calculation for 2-person household (simple, spec-aligned)
  //   balance > 0 → first member is owed by second (positive = first is ahead)
  // We return { owed_by_user_id, owed_to_user_id, amount, quitt, members_order }
  const balance = useMemo(() => {
    if (houseMembers.length < 2) return { quitt: true, owed_by: null, owed_to: null, amount: 0 };
    const [a, b] = houseMembers;
    const aPaid = (totals[a.user_id] || 0) + (settlementSum[a.user_id] || 0);
    const bPaid = (totals[b.user_id] || 0) + (settlementSum[b.user_id] || 0);
    // Positive carryOver means a was owed at month-end last month
    const diff = (aPaid - bPaid) + currentMonthCarryOver;
    // If diff > 0 → a paid more → b owes a
    if (Math.abs(diff) < 0.005) return { quitt: true, owed_by: null, owed_to: null, amount: 0, diff: 0 };
    if (diff > 0) return { quitt: false, owed_by: b.user_id, owed_to: a.user_id, amount: Math.abs(diff) / 2, diff };
    return { quitt: false, owed_by: a.user_id, owed_to: b.user_id, amount: Math.abs(diff) / 2, diff };
  }, [houseMembers, totals, settlementSum, currentMonthCarryOver]);

  const archiveCurrentMonth = async () => {
    if (!member?.household_id) return;
    const totalsByUser = {};
    houseMembers.forEach((m) => { totalsByUser[m.user_id] = (totals[m.user_id] || 0).toFixed(2); });
    const carryOver = balance.quitt ? 0 : (balance.diff || 0);
    const { error } = await supabase
      .from('monthly_balance_archive')
      .upsert({
        household_id: member.household_id,
        month_key: currentMonth,
        totals_by_user: totalsByUser,
        balance_carried_over: Number(carryOver.toFixed(2)),
        archived_by: member.user_id,
      }, { onConflict: 'household_id,month_key' });
    if (error) console.warn('[expenses] archive failed:', error.message);
    else fetchArchive();
  };

  const sumAllUsersThisMonth = useMemo(
    () => Object.values(totals).reduce((s, v) => s + v, 0),
    [totals]
  );

  return (
    <ExpensesContext.Provider
      value={{
        expenses, archive, loading,
        currentMonth, setCurrentMonth,
        houseMembers, memberColorMap, memberNameMap,
        totals, balance, currentMonthCarryOver, sumAllUsersThisMonth,
        addExpense, deleteExpense, archiveCurrentMonth,
      }}
    >
      {children}
    </ExpensesContext.Provider>
  );
};

export const useExpenses = () => useContext(ExpensesContext);
