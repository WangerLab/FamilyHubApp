import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText, ClipboardCheck } from 'lucide-react';

export default function PlanModeHubPage() {
  const navigate = useNavigate();
  return (
    <div
      data-testid="plan-mode-hub-page"
      className="pb-4"
      style={{ fontFamily: 'DM Sans, sans-serif' }}
    >
      <div className="sticky top-0 z-10 -mx-4 px-4 bg-slate-50 dark:bg-slate-950 flex items-center gap-3 pt-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => navigate('/projects')}
          className="p-2 -ml-2 rounded-lg active:opacity-70"
          aria-label="Zurück"
        >
          <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>
        <h1
          className="text-xl font-bold text-slate-900 dark:text-slate-50 flex-1"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Planungsmodus
        </h1>
      </div>

      <div className="px-4 pt-4 space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Erstelle neue Projekte mit KI-Unterstützung oder lasse bestehende Projekte unter neuem Kontext überprüfen.
        </p>

        <button
          type="button"
          onClick={() => navigate('/projects/plan-new')}
          className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-left active:opacity-70 flex items-start gap-3"
          data-testid="plan-mode-card-new"
        >
          <FileText className="w-6 h-6 text-rose-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h2
              className="text-base font-semibold text-slate-900 dark:text-slate-50"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Neues Projekt planen
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Beschreibe was du vorhast, KI strukturiert es in Cluster und Aufgaben.
            </p>
          </div>
        </button>

        <div
          aria-disabled="true"
          className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex items-start gap-3 opacity-60 cursor-not-allowed relative"
          data-testid="plan-mode-card-review"
        >
          <ClipboardCheck className="w-6 h-6 text-slate-400 dark:text-slate-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h2
              className="text-base font-semibold text-slate-900 dark:text-slate-50"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Bestehendes Projekt reviewen
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Mid-Project-Check mit KI-Vorschlägen.
            </p>
          </div>
          <span className="absolute top-3 right-3 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5">
            Bald verfügbar
          </span>
        </div>
      </div>
    </div>
  );
}
