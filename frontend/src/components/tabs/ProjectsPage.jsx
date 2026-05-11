import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FolderKanban } from 'lucide-react';
import { useProjects } from '../../contexts/ProjectsContext';
import ProjectRow from '../projects/ProjectRow';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { projects, clusters, microtasks, loading } = useProjects();

  const activeProjects = projects
    .filter((p) => !p.archived && !p.removed_at)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  return (
    <div data-testid="projects-page" className="pb-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="sticky top-0 z-10 -mx-4 px-4 bg-slate-50 dark:bg-slate-950 flex items-center gap-3 pt-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => navigate('/')}
          className="p-2 -ml-2 rounded-lg active:opacity-70"
          aria-label="Zurück"
        >
          <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>
        <h1
          className="text-xl font-bold text-slate-900 dark:text-slate-50 flex-1"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Projekte
        </h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <p className="text-slate-500 dark:text-slate-400">Lade…</p>
        </div>
      ) : activeProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <FolderKanban className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Noch keine Projekte</p>
        </div>
      ) : (
        <div className="space-y-3 px-4 pt-4">
          {activeProjects.map((p) => (
            <ProjectRow
              key={p.id}
              project={p}
              clusters={clusters}
              microtasks={microtasks}
            />
          ))}
        </div>
      )}
    </div>
  );
}
