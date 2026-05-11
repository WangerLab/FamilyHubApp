import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

const ProjectsContext = createContext(null);

// Generic realtime handler. parentOk(row) gates events whose parent isn't in our
// local state (clusters/microtasks have no household_id filter on the channel).
const handleEvent = (payload, { setter, idsRef, parentOk, prepend }) => {
  if (payload.eventType === 'INSERT') {
    if (parentOk && !parentOk(payload.new)) return;
    if (payload.new.removed_at || payload.new.archived) return;
    idsRef?.current.add(payload.new.id);
    setter((prev) => (prev.some((x) => x.id === payload.new.id) ? prev : prepend ? [payload.new, ...prev] : [...prev, payload.new]));
  } else if (payload.eventType === 'UPDATE') {
    if (parentOk && !parentOk(payload.new)) return;
    if (payload.new.removed_at || payload.new.archived) {
      idsRef?.current.delete(payload.new.id);
      setter((prev) => prev.filter((x) => x.id !== payload.new.id));
    } else {
      idsRef?.current.add(payload.new.id);
      setter((prev) => prev.map((x) => (x.id === payload.new.id ? payload.new : x)));
    }
  } else if (payload.eventType === 'DELETE') {
    idsRef?.current.delete(payload.old.id);
    setter((prev) => prev.filter((x) => x.id !== payload.old.id));
  }
};

export const ProjectsProvider = ({ children }) => {
  const { member } = useAuth();
  const [projects, setProjects] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [microtasks, setMicrotasks] = useState([]);
  const [houseMembers, setHouseMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Refs let realtime handlers filter cluster/microtask events without stale closures
  const projectIdsRef = useRef(new Set());
  const clusterIdsRef = useRef(new Set());

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
    const hid = member.household_id;

    // Chose IN-filter approach over nested inner-joins so row shapes match the
    // realtime payloads. RLS still enforces auth on the underlying tables.
    const fetchAll = async () => {
      const { data: ps } = await supabase
        .from('projects').select('*')
        .eq('household_id', hid).is('removed_at', null).eq('archived', false)
        .order('updated_at', { ascending: false });
      const projectsList = ps || [];
      const projectIds = projectsList.map((p) => p.id);
      let clustersList = [];
      let microtasksList = [];
      if (projectIds.length > 0) {
        const { data: cs } = await supabase
          .from('project_clusters').select('*')
          .in('project_id', projectIds).is('removed_at', null).eq('archived', false)
          .order('cluster_order', { ascending: true });
        clustersList = cs || [];
        const clusterIds = clustersList.map((c) => c.id);
        if (clusterIds.length > 0) {
          const { data: ms } = await supabase
            .from('project_microtasks').select('*')
            .in('cluster_id', clusterIds).is('removed_at', null).eq('archived', false)
            .order('task_order', { ascending: true });
          microtasksList = ms || [];
        }
      }
      setProjects(projectsList);
      setClusters(clustersList);
      setMicrotasks(microtasksList);
      projectIdsRef.current = new Set(projectsList.map((p) => p.id));
      clusterIdsRef.current = new Set(clustersList.map((c) => c.id));
      setLoading(false);
    };
    fetchAll();

    const projectsChannel = supabase
      .channel(`projects:${hid}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'projects', filter: `household_id=eq.${hid}` },
        (payload) => handleEvent(payload, { setter: setProjects, idsRef: projectIdsRef, prepend: true })
      )
      .subscribe();

    const clustersChannel = supabase
      .channel(`clusters:${hid}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'project_clusters' },
        (payload) => handleEvent(payload, {
          setter: setClusters,
          idsRef: clusterIdsRef,
          parentOk: (row) => projectIdsRef.current.has(row.project_id),
        })
      )
      .subscribe();

    const microtasksChannel = supabase
      .channel(`microtasks:${hid}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'project_microtasks' },
        (payload) => handleEvent(payload, {
          setter: setMicrotasks,
          parentOk: (row) => clusterIdsRef.current.has(row.cluster_id),
        })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(projectsChannel);
      supabase.removeChannel(clustersChannel);
      supabase.removeChannel(microtasksChannel);
    };
  }, [member?.household_id]);

  const memberColorMap = {};
  const memberNameMap = {};
  houseMembers.forEach((m) => {
    memberColorMap[m.user_id] = m.color;
    memberNameMap[m.user_id] = m.display_name;
  });

  return (
    <ProjectsContext.Provider
      value={{
        projects, clusters, microtasks, loading,
        houseMembers, memberColorMap, memberNameMap,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
};

export const useProjects = () => useContext(ProjectsContext);
