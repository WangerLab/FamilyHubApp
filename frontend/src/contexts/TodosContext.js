import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';
import { useActivity } from './ActivityContext';

const TodosContext = createContext(null);

export const TodosProvider = ({ children }) => {
  const { user, member } = useAuth();
  const activity = useActivity();
  const [todos, setTodos] = useState([]);
  const [houseMembers, setHouseMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nudgeToast, setNudgeToast] = useState(null); // { id, title, fromName }
  const [pendingDelete, setPendingDelete] = useState(null); // { id, todo, timer }
  const previousTodoMap = useRef({});

  const fetchAll = useCallback(async () => {
    if (!member?.household_id) return;
    const { data } = await supabase
      .from('todos')
      .select('*')
      .eq('household_id', member.household_id)
      .order('created_at', { ascending: false });
    setTodos(data || []);
    // seed previous map so initial realtime snapshots don't retrigger
    previousTodoMap.current = Object.fromEntries((data || []).map((t) => [t.id, t]));
    setLoading(false);
  }, [member?.household_id]);

  // Load household member colors
  useEffect(() => {
    if (!member?.household_id) return;
    supabase
      .from('household_members')
      .select('user_id, display_name, color')
      .eq('household_id', member.household_id)
      .then(({ data }) => { if (data) setHouseMembers(data); });
  }, [member?.household_id]);

  // Call RPC to archive old todos (> 7 days completed) on mount
  useEffect(() => {
    if (!member?.household_id) return;
    supabase.rpc('archive_old_todos').then(({ error }) => {
      if (error) console.warn('[todos] archive_old_todos failed:', error.message);
      else fetchAll(); // refresh after archive
    });
  }, [member?.household_id, fetchAll]);

  // Initial fetch + Realtime
  useEffect(() => {
    if (!member?.household_id) { setLoading(false); return; }
    setLoading(true);
    fetchAll();

    const channel = supabase
      .channel(`todos:${member.household_id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos', filter: `household_id=eq.${member.household_id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTodos((prev) => (prev.some((t) => t.id === payload.new.id) ? prev : [payload.new, ...prev]));
            previousTodoMap.current[payload.new.id] = payload.new;
          } else if (payload.eventType === 'UPDATE') {
            const prev = previousTodoMap.current[payload.new.id];
            // In-app nudge toast: fire when nudge_sent_at changed AND I am the assignee
            if (
              prev &&
              payload.new.nudge_sent_at &&
              payload.new.nudge_sent_at !== prev.nudge_sent_at &&
              payload.new.assigned_to === user?.id &&
              payload.new.nudge_sent_by !== user?.id
            ) {
              const fromMember = houseMembers.find((m) => m.user_id === payload.new.nudge_sent_by);
              setNudgeToast({
                id: payload.new.id,
                title: payload.new.title,
                fromName: fromMember?.display_name || 'Jemand',
              });
              // auto-dismiss after 6s
              setTimeout(() => setNudgeToast((t) => (t?.id === payload.new.id ? null : t)), 6000);
            }
            previousTodoMap.current[payload.new.id] = payload.new;
            setTodos((prev) => prev.map((t) => (t.id === payload.new.id ? payload.new : t)));
          } else if (payload.eventType === 'DELETE') {
            delete previousTodoMap.current[payload.old.id];
            setTodos((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [member?.household_id, user?.id, houseMembers, fetchAll]);

  const memberColorMap = {};
  const memberNameMap = {};
  houseMembers.forEach((m) => {
    memberColorMap[m.user_id] = m.color;
    memberNameMap[m.user_id] = m.display_name;
  });

  // ---- CRUD ----
  const addTodo = async ({ title, priority = 'medium', due_date = null, assigned_to = null, comment = null }, opts = {}) => {
    if (!member?.household_id || !title?.trim()) return null;
    const { data: inserted } = await supabase
      .from('todos')
      .insert({
        household_id: member.household_id,
        created_by: member.user_id,
        assigned_to: assigned_to || null,
        title: title.trim(),
        priority,
        due_date: due_date || null,
        comment: comment || null,
      })
      .select()
      .single();
    if (inserted) {
      setTodos((prev) => (prev.some((t) => t.id === inserted.id) ? prev : [inserted, ...prev]));
      previousTodoMap.current[inserted.id] = inserted;
      if (!opts.silent && activity?.logActivity) {
        activity.logActivity({
          action_type: 'todo_create',
          module: 'todos',
          item_id: inserted.id,
          description: `${member.display_name} hat eine Aufgabe erstellt: „${title.trim()}"`,
        });
      }
    }
    return inserted;
  };

  const updateTodo = async (id, updates) => {
    const { data: updated } = await supabase
      .from('todos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (updated) {
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
      previousTodoMap.current[id] = updated;
    }
    return updated;
  };

  const toggleTodo = async (id) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const completed = !todo.completed;
    await updateTodo(id, {
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      completed_by: completed ? member.user_id : null,
    });
    if (completed && activity?.logActivity) {
      activity.logActivity({
        action_type: 'todo_complete',
        module: 'todos',
        item_id: id,
        description: `${member.display_name} hat „${todo.title}" erledigt`,
      });
    }
  };

  const softDelete = (id) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    if (pendingDelete) {
      clearTimeout(pendingDelete.timer);
      supabase.from('todos').delete().eq('id', pendingDelete.id);
    }
    setTodos((prev) => prev.filter((t) => t.id !== id));
    const timer = setTimeout(async () => {
      await supabase.from('todos').delete().eq('id', id);
      setPendingDelete(null);
    }, 5000);
    setPendingDelete({ id, todo, timer });
  };

  const undoDelete = () => {
    if (!pendingDelete) return;
    clearTimeout(pendingDelete.timer);
    setTodos((prev) => [pendingDelete.todo, ...prev]);
    setPendingDelete(null);
  };

  const sendNudge = async (id) => {
    // Client guard: cannot nudge more than once per 24h
    const todo = todos.find((t) => t.id === id);
    if (!todo) return { ok: false, reason: 'not-found' };
    if (todo.nudge_sent_at) {
      const sentAt = new Date(todo.nudge_sent_at);
      if (Date.now() - sentAt.getTime() < 24 * 60 * 60 * 1000) {
        return { ok: false, reason: 'cooldown' };
      }
    }
    await updateTodo(id, {
      nudge_sent_at: new Date().toISOString(),
      nudge_sent_by: user.id,
    });
    if (activity?.logActivity) {
      activity.logActivity({
        action_type: 'todo_nudge',
        module: 'todos',
        item_id: id,
        description: `${member.display_name} hat angestupst: „${todo.title}"`,
      });
    }
    return { ok: true };
  };

  const dismissNudgeToast = () => setNudgeToast(null);

  // ---- Derived views ----
  const activeTodos = todos.filter((t) => !t.archived && !t.completed);
  const completedTodos = todos.filter((t) => !t.archived && t.completed);
  const archivedTodos = todos.filter((t) => t.archived);

  const activeCount = activeTodos.length;
  const overdueCount = activeTodos.filter((t) => t.due_date && new Date(t.due_date) < new Date()).length;

  // Weekly stats (for gamification): count completions by user in current ISO week
  const weeklyStats = (() => {
    const start = startOfISOWeek(new Date());
    const counts = {};
    todos.forEach((t) => {
      if (t.completed && t.completed_at && t.completed_by && new Date(t.completed_at) >= start) {
        counts[t.completed_by] = (counts[t.completed_by] || 0) + 1;
      }
    });
    return counts;
  })();

  return (
    <TodosContext.Provider
      value={{
        todos, activeTodos, completedTodos, archivedTodos,
        activeCount, overdueCount, loading,
        memberColorMap, memberNameMap, houseMembers,
        weeklyStats,
        addTodo, updateTodo, toggleTodo, sendNudge,
        softDelete, undoDelete, pendingDelete,
        nudgeToast, dismissNudgeToast,
      }}
    >
      {children}
    </TodosContext.Provider>
  );
};

function startOfISOWeek(d) {
  const date = new Date(d);
  const day = date.getDay() || 7; // Sunday = 7
  if (day !== 1) date.setDate(date.getDate() - (day - 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

export const useTodos = () => useContext(TodosContext);
