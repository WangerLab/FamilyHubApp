import React from 'react';
import { ArrowLeft, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WeeklyRecap from './WeeklyRecap';

export default function StatisticsPage() {
  const navigate = useNavigate();

  return (
    <div data-testid="statistics-page" className="pb-4">
      <div className="flex items-center gap-3 pt-3 pb-4">
        <button
          onClick={() => navigate('/home')}
          className="p-2 -ml-2 rounded-lg active:opacity-70"
          aria-label="Zurück"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h1
            className="text-xl font-bold text-slate-900 dark:text-slate-50"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Statistik
          </h1>
        </div>
      </div>

      <WeeklyRecap />

      <div className="mt-8 px-1">
        <p className="text-xs text-slate-400 dark:text-slate-500 italic">
          Mehr Statistiken kommen bald: Gesamt-Ranking, Streaks, Erfolge.
        </p>
      </div>
    </div>
  );
}
