import React from 'react';
import { CheckSquare, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function TasksTab() {
  const { member } = useAuth();
  const color = member?.color || '#3B82F6';

  return (
    <div
      data-testid="tasks-tab"
      className="flex flex-col items-center justify-center h-full text-center space-y-6 py-12 px-4"
    >
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg"
        style={{ backgroundColor: `${color}15`, border: `2px solid ${color}30` }}
      >
        <CheckSquare className="w-10 h-10 text-slate-300 dark:text-slate-700" strokeWidth={1.5} />
      </div>

      <div className="space-y-2">
        <h2
          className="text-xl font-bold text-slate-900 dark:text-slate-50"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          To-Do List
        </h2>
        <p className="text-base text-slate-500 dark:text-slate-400 max-w-xs">
          Shared household tasks will appear here. Stay on top of everything together.
        </p>
      </div>

      <button
        className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-medium text-sm active:scale-[0.97] transition-transform duration-100"
        style={{ backgroundColor: color, fontFamily: 'DM Sans, sans-serif' }}
      >
        <Plus className="w-4 h-4" />
        Coming soon
      </button>
    </div>
  );
}
