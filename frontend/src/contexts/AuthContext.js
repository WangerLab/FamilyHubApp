import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMember = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('household_members')
      .select('id, household_id, user_id, display_name, color, created_at')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('loadMember failed:', error);
      setMember(null);
      return;
    }

    setMember(data);
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setUser(session.user);
        loadMember(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setMember(null);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user);
        // Member stays in state — token refresh doesn't change member data
      }
    });

    // Reconnect-safe: re-validate session on visibility change (iOS Safari fix)
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setUser(null);
        setMember(null);
      }
      // Member data stays in state — no need to re-fetch
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
