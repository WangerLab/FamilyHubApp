import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useChores } from '../../contexts/ChoresContext';
import { useAuth } from '../../contexts/AuthContext';
import AddChoreInput from '../chores/AddChoreInput';
import ChoreCard from '../chores/ChoreCard';
import WeeklyStats from '../tasks/WeeklyStats';

function EmptyState({ color }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 shadow-lg"
        style={{ backgroundColor: `${color}15`, border: `2px solid ${color}30` }}
      >
        <RefreshCw className="w-10 h-10" style={{ color: `${color}80` }} strokeWidth={1.5} />
      </div>
      <h3
        className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2"
        style={{ fontFamily: 'Manrope, sans-serif' }}
      >
        Noch keine Aufgaben
      </h3>
      <p className="text-sm text-slate-400 dark:text-slate-500 max-w-[280px]">
        Was soll regelmässig erledigt werden? Staubsaugen, Badezimmer putzen, Wäsche…
      </p>
    </div>
  );
}

export default function ChoresTab() {
  const { member } = useAuth();
  const { chores, loading } = useChores();
  const color = member?.color || '#3B82F6';

  return (
    <div data-testid="chores-tab" className="space-y-3 pb-4">
      <div className="flex items-center justify-between pt-2 pb-1">
        <h2
          className="text-xl font-bold text-slate-900 dark:text-slate-50"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Wiederkehrendes
        </h2>
      </div>

      <AddChoreInput />

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-6 h-6 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-blue-500 animate-spin" />
        </div>
      ) : chores.length === 0 ? (
        <EmptyState color={color} />
      ) : (
        <div data-testid="chores-list" className="space-y-2">
          {chores.map((c) => <ChoreCard key={c.id} chore={c} />)}
        </div>
      )}

      <WeeklyStats source="chores" />
    </div>
  );
}
