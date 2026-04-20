import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMember = useCallback(async (userId) => {
    const { data } = await supabase
      .from('household_members')
      .select('id, household_id, user_id, display_name, color, created_at')
      .eq('user_id', userId)
      .single();

    if (data) {
      setMember(data);
      return;
    }

    // Fallback: create a new household for this user
    const householdId = crypto.randomUUID();
    await supabase.from('households').insert({ id: householdId, name: 'Wanger Family Hub' });

    const memberId = crypto.randomUUID();
    await supabase.from('household_members').insert({
      id: memberId,
      household_id: householdId,
      user_id: userId,
      display_name: 'Family Member',
      color: '#3B82F6',
    });

    const { data: newMember } = await supabase
      .from('household_members')
      .select('id, household_id, user_id, display_name, color, created_at')
      .eq('id', memberId)
      .single();

    setMember(newMember);
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        await loadMember(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session.user);
        await loadMember(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setMember(null);
      }
    });

    // Reconnect-safe: re-validate session on visibility change (iOS Safari fix)
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await loadMember(session.user.id);
      } else {
        setUser(null);
        setMember(null);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadMember]);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMember(null);
  };

  const updateMemberColor = async (color) => {
    if (!member) return;
    const { data } = await supabase
      .from('household_members')
      .update({ color })
      .eq('id', member.id)
      .select('id, household_id, user_id, display_name, color, created_at')
      .single();
    if (data) setMember(data);
  };

  const updateDisplayName = async (displayName) => {
    if (!member) return;
    const { data } = await supabase
      .from('household_members')
      .update({ display_name: displayName })
      .eq('id', member.id)
      .select('id, household_id, user_id, display_name, color, created_at')
      .single();
    if (data) setMember(data);
  };

  return (
    <AuthContext.Provider value={{ user, member, loading, signIn, signOut, updateMemberColor, updateDisplayName }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
