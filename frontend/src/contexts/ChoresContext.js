import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

const ChoresContext = createContext(null);

function isoWeekInfo(date = new Date()) {
  // Returns { week, year } matching Postgres ISOWEEK/ISOYEAR
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Thursday determines the ISO week
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

export const ChoresProvider = ({ children }) => {
  const { member } = useAuth();
  const [chores, setChores] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [houseMembers, setHouseMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchChores = useCallback(async () => {
    if (!member?.household_id) return;
    const { data } = await supabase
      .from('chores')
      .select('*')
      .eq('household_id', member.household_id)
      .order('created_at', { ascending: true });
    setChores(data || []);
  }, [member?.household_id]);

  const fetchCompletions = useCallback(async () => {
    if (!member?.household_id) return;
    // Pull the last 60 days — enough for weekly/bi-weekly/monthly displays + history
    const sinceIso = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
    const { data } = await supabase
      .from('chore_completions')
      .select('*')
      .eq('household_id', member.household_id)
      .gte('completed_at', sinceIso)
      .order('completed_at', { ascending: false });
    setCompletions(data || []);
  }, [member?.household_id]);

  useEffect(() => {
    if (!member?.household_id) return;
    supabase
      .from('household_members')
      .select('user_id, display_name, color')
      .eq('household_id', member.household_id)
      .then(({ data }) => { if (data) setHouseMembers(data); });
  }, [member?.household_id]);

  useEffect(() => {
    if (!member?.household_id) { setLoading(false); return; }
    setLoading(true);
    Promise.all([fetchChores(), fetchCompletions()]).then(() => setLoading(false));

    const ch = supabase
      .channel(`chores:${member.household_id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'chores', filter: `household_id=eq.${member.household_id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setChores((prev) => (prev.some((c) => c.id === payload.new.id) ? prev : [...prev, payload.new]));
          } else if (payload.eventType === 'UPDATE') {
            setChores((prev) => prev.map((c) => (c.id === payload.new.id ? payload.new : c)));
          } else if (payload.eventType === 'DELETE') {
            setChores((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'chore_completions', filter: `household_id=eq.${member.household_id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCompletions((prev) => (prev.some((c) => c.id === payload.new.id) ? prev : [payload.new, ...prev]));
          } else if (payload.eventType === 'DELETE') {
            setCompletions((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [member?.household_id, fetchChores, fetchCompletions]);

  const memberColorMap = {};
  const memberNameMap = {};
  houseMembers.forEach((m) => {
    memberColorMap[m.user_id] = m.color;
    memberNameMap[m.user_id] = m.display_name;
  });

  // ---- CRUD ----
  const addChore = async ({ title, reset_frequency = '1x_week', custom_days = null }) => {
    if (!member?.household_id || !title?.trim()) return null;
    const { data: inserted } = await supabase
      .from('chores')
      .insert({
        household_id: member.household_id,
        created_by: member.user_id,
        title: title.trim(),
        reset_frequency,
        custom_days: reset_frequency === 'custom' ? custom_days : null,
      })
      .select()
      .single();
    if (inserted) {
      setChores((prev) => (prev.some((c) => c.id === inserted.id) ? prev : [...prev, inserted]));
    }
    return inserted;
  };

  const deleteChore = async (id) => {
    setChores((prev) => prev.filter((c) => c.id !== id));
    await supabase.from('chores').delete().eq('id', id);
  };

  const logCompletion = async (choreId) => {
    if (!member?.household_id) return;
    const nowIso = new Date().toISOString();
    // Server trigger fills week_number/year/month but we pass them too as safety.
    const info = isoWeekInfo(new Date());
    const { data: inserted } = await supabase
      .from('chore_completions')
      .insert({
        chore_id: choreId,
        household_id: member.household_id,
        completed_by: member.user_id,
        completed_at: nowIso,
        week_number: info.week,
        year: info.year,
        month: new Date().getMonth() + 1,
      })
      .select()
      .single();
    if (inserted) setCompletions((prev) => (prev.some((c) => c.id === inserted.id) ? prev : [inserted, ...prev]));
    return inserted;
  };

  const undoCompletion = async (completionId) => {
    setCompletions((prev) => prev.filter((c) => c.id !== completionId));
    await supabase.from('chore_completions').delete().eq('id', completionId);
  };

  // ---- Derived: progress per chore in current period ----
  const periodCompletions = (chore) => {
    const now = new Date();
    if (chore.reset_frequency === '1x_month') {
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      return completions.filter((c) => c.chore_id === chore.id && c.year === y && c.month === m);
    }
    if (chore.reset_frequency === 'custom' && chore.custom_days) {
      const cutoff = new Date(now.getTime() - chore.custom_days * 24 * 3600 * 1000);
      return completions.filter((c) => c.chore_id === chore.id && new Date(c.completed_at) >= cutoff);
    }
    // weekly (1x_week / 2x_week) → current ISO week
    const { week, year } = isoWeekInfo(now);
    return completions.filter((c) => c.chore_id === chore.id && c.week_number === week && c.year === year);
  };

  const targetCount = (chore) => {
    if (chore.reset_frequency === '1x_week') return 1;
    if (chore.reset_frequency === '2x_week') return 2;
    if (chore.reset_frequency === '1x_month') return 1;
    return 1; // custom = 1 per cycle
  };

  // Gamification — count completions this week by user
  const weeklyStats = (() => {
    const { week, year } = isoWeekInfo(new Date());
    const counts = {};
    completions.forEach((c) => {
      if (c.week_number === week && c.year === year && c.completed_by) {
        counts[c.completed_by] = (counts[c.completed_by] || 0) + 1;
      }
    });
    return counts;
  })();

  return (
    <ChoresContext.Provider
      value={{
        chores, completions, loading,
        memberColorMap, memberNameMap, houseMembers,
        addChore, deleteChore, logCompletion, undoCompletion,
        periodCompletions, targetCount,
        weeklyStats,
      }}
    >
      {children}
    </ChoresContext.Provider>
  );
};

export const useChores = () => useContext(ChoresContext);
