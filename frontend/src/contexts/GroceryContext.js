import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

const GroceryContext = createContext(null);

export const GroceryProvider = ({ children }) => {
  const { member } = useAuth();
  const [items, setItems] = useState([]);
  const [houseMembers, setHouseMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null); // { id, item, timer }
  const [shoppingMode, setShoppingMode] = useState(
    () => localStorage.getItem('shoppingMode') === 'true'
  );

  const fetchItems = useCallback(async () => {
    if (!member?.household_id) return;
    const { data } = await supabase
      .from('grocery_items')
      .select('*')
      .eq('household_id', member.household_id)
      .order('created_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  }, [member?.household_id]);

  // Fetch all household members for color map
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
      .channel(`grocery:${member.household_id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'grocery_items', filter: `household_id=eq.${member.household_id}` },
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

  // Map user_id → color
  const memberColorMap = {};
  houseMembers.forEach((m) => { memberColorMap[m.user_id] = m.color; });

  // --- CRUD ---
  const addItem = async (data) => {
    if (!member?.household_id) return;
    const { data: inserted } = await supabase
      .from('grocery_items')
      .insert({
        household_id: member.household_id,
        created_by: member.user_id,
        name: data.name,
        category: data.category,
        quantity: data.quantity ?? 1,
        unit: data.unit || null,
        note: data.note || null,
        checked: false,
        sort_order: 0,
      })
      .select()
      .single();
    if (inserted) {
      setItems((prev) => (prev.some((i) => i.id === inserted.id) ? prev : [inserted, ...prev]));
    }
    return inserted;
  };

  const updateItem = async (id, updates) => {
    const { data: updated } = await supabase
      .from('grocery_items')
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
  };

  const softDelete = (id) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    // Commit any previous pending delete immediately
    if (pendingDelete) {
      clearTimeout(pendingDelete.timer);
      supabase.from('grocery_items').delete().eq('id', pendingDelete.id);
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    const timer = setTimeout(async () => {
      await supabase.from('grocery_items').delete().eq('id', id);
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
    await supabase.from('grocery_items').delete().eq('household_id', member.household_id);
  };

  const toggleShoppingMode = () => {
    setShoppingMode((prev) => {
      const next = !prev;
      localStorage.setItem('shoppingMode', String(next));
      return next;
    });
  };

  const uncheckedCount = items.filter((i) => !i.checked).length;

  return (
    <GroceryContext.Provider
      value={{
        items, loading, uncheckedCount, memberColorMap,
        shoppingMode, toggleShoppingMode,
        addItem, updateItem, toggleItem,
        softDelete, undoDelete, pendingDelete,
        clearList,
      }}
    >
      {children}
    </GroceryContext.Provider>
  );
};

export const useGrocery = () => useContext(GroceryContext);
