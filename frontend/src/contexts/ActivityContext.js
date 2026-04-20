import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

const ActivityContext = createContext(null);

const MAX_ENTRIES = 50;

export const ActivityProvider = ({ children }) => {
  const { user, member } = useAuth();
  const [entries, setEntries] = useState([]);
  const [houseMembers, setHouseMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!member?.household_id) return;
    const { data } = await supabase
      .from('activity_log')
      .select('*')
      .eq('household_id', member.household_id)
      .order('created_at', { ascending: false })
      .limit(MAX_ENTRIES);
    setEntries(data || []);
    setLoading(false);
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
    fetchEntries();

    const channel = supabase
      .channel(`activity:${member.household_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log', filter: `household_id=eq.${member.household_id}` },
        (payload) => {
          setEntries((prev) => {
            if (prev.some((e) => e.id === payload.new.id)) return prev;
            return [payload.new, ...prev].slice(0, MAX_ENTRIES);
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'activity_log', filter: `household_id=eq.${member.household_id}` },
        (payload) => {
          setEntries((prev) => prev.map((e) => (e.id === payload.new.id ? payload.new : e)));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [member?.household_id, fetchEntries]);

  // --- Insert helper used by other contexts (fire-and-forget) ---
  const logActivity = useCallback(
    async ({ action_type, module, item_id = null, description }) => {
      if (!member?.household_id || !user?.id) return;
      try {
        const { error } = await supabase.from('activity_log').insert({
          household_id: member.household_id,
          actor_id: user.id,
          action_type,
          module,
          item_id,
          description,
        });
        if (error) console.warn('[activity] log failed:', error.message);
      } catch (e) {
        console.warn('[activity] log exception:', e);
      }
    },
    [member?.household_id, user?.id]
  );

  const markAllRead = useCallback(async () => {
    if (!user?.id) return;
    // Optimistic update
    setEntries((prev) =>
      prev.map((e) =>
        (e.read_by_user_ids || []).includes(user.id)
          ? e
          : { ...e, read_by_user_ids: [...(e.read_by_user_ids || []), user.id] }
      )
    );
    await supabase.rpc('mark_all_notifications_read');
  }, [user?.id]);

  const unreadCount = entries.filter(
    (e) => !(e.read_by_user_ids || []).includes(user?.id)
  ).length;

  const memberMap = {};
  houseMembers.forEach((m) => { memberMap[m.user_id] = m; });

  return (
    <ActivityContext.Provider
      value={{ entries, loading, unreadCount, logActivity, markAllRead, memberMap }}
    >
      {children}
    </ActivityContext.Provider>
  );
};

export const useActivity = () => useContext(ActivityContext);
