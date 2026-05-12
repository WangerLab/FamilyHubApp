import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import ProjectPickerStep from '../projects/ProjectPickerStep';

const PHASE_TITLES = {
  project_picker: 'Projekt wählen',
  context_dump: 'Kontext eingeben',
  suggestions_review: 'Vorschläge prüfen',
};

const PHASE_NUMBERS = {
  project_picker: 1,
  context_dump: 2,
  suggestions_review: 3,
};

export default function ReviewProjectPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('project_picker');
  const [selectedProject, setSelectedProject] = useState(null);

  const handlePick = (project) => {
    setSelectedProject(project);
    setPhase('context_dump');
  };

  const handleBack = () => {
    if (phase === 'project_picker') {
      navigate('/projects/plan-mode-hub');
      return;
    }
    if (phase === 'context_dump') {
      setSelectedProject(null);
      setPhase('project_picker');
      return;
    }
    if (phase === 'suggestions_review') {
      setPhase('context_dump');
      return;
    }
  };

  return (
    <div
      data-testid="review-project-page"
      className="pb-4"
      style={{ fontFamily: 'DM Sans, sans-serif' }}
    >
      <div className="sticky top-0 z-10 -mx-4 px-4 bg-slate-50 dark:bg-slate-950 flex items-center gap-3 pt-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 rounded-lg active:opacity-70"
          aria-label="Zurück"
        >
          <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>
        <div className="flex-1 min-w-0">
          <h1
            className="text-base font-semibold text-slate-900 dark:text-slate-50 truncate"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Review {selectedProject ? `· ${selectedProject.name}` : ''}
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Schritt {PHASE_NUMBERS[phase]} / 3 · {PHASE_TITLES[phase]}
          </p>
        </div>
      </div>

      {phase === 'project_picker' && (
        <ProjectPickerStep onPick={handlePick} />
      )}

      {phase === 'context_dump' && (
        <div className="px-4 pt-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Phase 2 — Context-Dump-UI kommt in Commit 8.
          </p>
        </div>
      )}

      {phase === 'suggestions_review' && (
        <div className="px-4 pt-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Phase 3 — Suggestions-Review-UI kommt in Commit 8.
          </p>
        </div>
      )}
    </div>
  );
}
