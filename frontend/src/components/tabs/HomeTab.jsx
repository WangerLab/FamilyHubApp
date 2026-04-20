import React from 'react';
import { House, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function HomeTab() {
  const { member } = useAuth();
  const name = member?.display_name || 'there';
  const color = member?.color || '#3B82F6';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div
      data-testid="home-tab"
      className="flex flex-col items-center justify-center h-full text-center space-y-6 py-12 px-4"
    >
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg"
        style={{ backgroundColor: `${color}15`, border: `2px solid ${color}30` }}
      >
        <House className="w-10 h-10" style={{ color }} strokeWidth={1.5} />
      </div>

      <div className="space-y-2">
        <h2
          className="text-2xl font-bold text-slate-900 dark:text-slate-50"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {greeting}, {name}!
        </h2>
        <p className="text-base text-slate-500 dark:text-slate-400 max-w-xs">
          Your family dashboard is coming soon. We're building something great together.
        </p>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <span className="text-sm text-slate-600 dark:text-slate-300" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          More features coming soon
        </span>
      </div>
    </div>
  );
}
