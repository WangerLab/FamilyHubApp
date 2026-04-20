import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';
import { useActivity } from './ActivityContext';
import { DEFAULT_MISC_LOCATION } from '../constants/miscLocations';

const MiscContext = createContext(null);

export const MiscProvider = ({ children }) => {
  const { member } = useAuth();
  const activity = useActivity();
  const [items, setItems] = useState([]);
  const [houseMembers, setHouseMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);

  const fetchItems = useCallback(async () => {
    if (!member?.household_id) return;
    const { data } = await supabase
      .from('misc_items')
      .select('*')
      .eq('household_id', member.household_id)
      .order('created_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  }, [member?.household_id]);

  // Fetch household member colors (shared with grocery)
  useEffect(() => {
    if (!member?.household_id) return;
    supabase
      .from('household_members')
      .select('user_id, display_name, color')
      .eq('household_id', member.household_id)
      .then(({ data }) => { if (data) setHouseMembers(data); });
  }, [member?.household_id]);

  // Initial load + Realtime subscription
  useEffect(() => {
    if (!member?.household_id) { setLoading(false); return; }
    setLoading(true);
    fetchItems();

    const channel = supabase
      .channel(`misc:${member.household_id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'misc_items', filter: `household_id=eq.${member.household_id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setItems((prev) =>
              prev.some((i) => i.id === payload.new.id) ? prev : [payload.new, ...prev]
            );
          } else if (payload.eventType === 'UPDATE') {
            setItems((prev) => prev.map((i) => (i.id === payload.new.id ? payload.new : i)));
          } else if (payload.eventType === 'DELETE') {
            setItems((prev) => prev.filter((i) => i.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [member?.household_id, fetchItems]);

  const memberColorMap = {};
  houseMembers.forEach((m) => { memberColorMap[m.user_id] = m.color; });

  // --- CRUD ---
  const addItem = async ({ name, location_tag, note }, opts = {}) => {
    if (!member?.household_id) return null;
    const { data: inserted } = await supabase
      .from('misc_items')
      .insert({
        household_id: member.household_id,
        created_by: member.user_id,
        name,
        location_tag: location_tag || DEFAULT_MISC_LOCATION,
        note: note || null,
        checked: false,
      })
      .select()
      .single();
    if (inserted) {
      setItems((prev) => (prev.some((i) => i.id === inserted.id) ? prev : [inserted, ...prev]));
      if (!opts.silent && activity?.logActivity) {
        activity.logActivity({
          action_type: 'misc_add',
          module: 'misc',
          item_id: inserted.id,
          description: `${member.display_name} hat „${name}" (${location_tag || DEFAULT_MISC_LOCATION}) notiert`,
        });
      }
    }
    return inserted;
  };

  const updateItem = async (id, updates) => {
    const { data: updated } = await supabase
      .from('misc_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (updated) setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    return updated;
  };

  const toggleItem = async (id) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const checked = !item.checked;
    await updateItem(id, {
      checked,
      checked_at: checked ? new Date().toISOString() : null,
      checked_by: checked ? member.user_id : null,
    });
    if (checked && activity?.logActivity) {
      activity.logActivity({
        action_type: 'misc_check',
        module: 'misc',
        item_id: id,
        description: `${member.display_name} hat „${item.name}" abgehakt`,
      });
    }
  };

  const softDelete = (id) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (pendingDelete) {
      clearTimeout(pendingDelete.timer);
      supabase.from('misc_items').delete().eq('id', pendingDelete.id);
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    const timer = setTimeout(async () => {
      await supabase.from('misc_items').delete().eq('id', id);
      setPendingDelete(null);
    }, 5000);
    setPendingDelete({ id, item, timer });
  };

  const undoDelete = () => {
    if (!pendingDelete) return;
    clearTimeout(pendingDelete.timer);
    setItems((prev) => [pendingDelete.item, ...prev]);
    setPendingDelete(null);
  };

  const clearList = async () => {
    if (!member?.household_id) return;
    if (pendingDelete) { clearTimeout(pendingDelete.timer); setPendingDelete(null); }
    setItems([]);
    await supabase.from('misc_items').delete().eq('household_id', member.household_id);
  };

  const uncheckedCount = items.filter((i) => !i.checked).length;

  return (
    <MiscContext.Provider
      value={{
        items, loading, uncheckedCount, memberColorMap,
        addItem, updateItem, toggleItem,
        softDelete, undoDelete, pendingDelete,
        clearList,
      }}
    >
      {children}
    </MiscContext.Provider>
  );
};

export const useMisc = () => useContext(MiscContext);
