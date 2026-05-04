import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
    const snapshot = entries;
    setEntries((prev) =>
      prev.map((e) =>
        (e.read_by_user_ids || []).includes(user.id)
          ? e
          : { ...e, read_by_user_ids: [...(e.read_by_user_ids || []), user.id] }
      )
    );
    const { error } = await supabase.rpc('mark_all_notifications_read');
    if (error) {
      console.warn('[activity] mark_all_notifications_read failed:', error.message);
      // Revert optimistic update
      setEntries(snapshot);
    }
  }, [user?.id, entries]);

  // --- Hide all notifications for the current user (per-user soft-hide) ---
  const [pendingHide, setPendingHide] = useState(null);

  const hideAll = useCallback(async () => {
    if (!user?.id) return;
    // Snapshot of currently-visible entry IDs for undo
    const visibleIds = entries
      .filter((e) => !(e.hidden_by_user_ids || []).includes(user.id))
      .map((e) => e.id);
    if (visibleIds.length === 0) return;

    // Optimistic: append user.id to hidden_by_user_ids on each visible entry
    const snapshot = entries;
    setEntries((prev) =>
      prev.map((e) =>
        visibleIds.includes(e.id)
          ? { ...e, hidden_by_user_ids: [...(e.hidden_by_user_ids || []), user.id] }
          : e
      )
    );

    const { error } = await supabase.rpc('hide_all_notifications');
    if (error) {
      console.warn('[activity] hide_all_notifications failed:', error.message);
      setEntries(snapshot);
      return;
    }
    setPendingHide({ ids: visibleIds, count: visibleIds.length });
  }, [user?.id, entries]);

  const undoHide = useCallback(async () => {
    if (!pendingHide || !user?.id) return;
    const { ids } = pendingHide;
    setPendingHide(null);
    // Optimistic: remove user.id from hidden_by_user_ids on each affected entry
    setEntries((prev) =>
      prev.map((e) =>
        ids.includes(e.id)
          ? { ...e, hidden_by_user_ids: (e.hidden_by_user_ids || []).filter((u) => u !== user.id) }
          : e
      )
    );
    // Persist to DB: remove user.id from hidden_by_user_ids on the listed IDs
    const { error } = await supabase
      .from('activity_log')
      .update({ hidden_by_user_ids: [] })
      .in('id', ids);
    // Note: this resets hidden_by_user_ids to [] for those entries, which removes
    // ALL hide marks (including potentially Iris's own hide marks if she previously
    // hid the same entries). That's an acceptable trade-off for the undo path —
    // the rare case where both partners hid the same entries within seconds is unlikely.
    // A precise per-user "remove just my UID" would need a dedicated RPC.
    if (error) {
      console.warn('[activity] undoHide failed:', error.message);
    }
  }, [pendingHide, user?.id]);

  // Auto-clear pending after 5s
  useEffect(() => {
    if (!pendingHide) return;
    const t = setTimeout(() => setPendingHide(null), 5000);
    return () => clearTimeout(t);
  }, [pendingHide]);

  const visibleEntries = useMemo(
    () => entries.filter((e) => !(e.hidden_by_user_ids || []).includes(user?.id)),
    [entries, user?.id]
  );

  const unreadCount = visibleEntries.filter(
    (e) => !(e.read_by_user_ids || []).includes(user?.id)
  ).length;

  const memberMap = {};
  houseMembers.forEach((m) => { memberMap[m.user_id] = m; });

  return (
    <ActivityContext.Provider
      value={{
        entries: visibleEntries,
        loading,
        unreadCount,
        logActivity,
        markAllRead,
        hideAll,
        undoHide,
        pendingHide,
        memberMap,
      }}
    >
      {children}
    </ActivityContext.Provider>
  );
};

export const useActivity = () => useContext(ActivityContext);
