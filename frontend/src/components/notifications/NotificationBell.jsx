import React from 'react';
import { Bell } from 'lucide-react';
import { useActivity } from '../../contexts/ActivityContext';

export default function NotificationBell({ onOpen }) {
  const activity = useActivity();
  const unread = activity?.unreadCount || 0;

  return (
    <button
      data-testid="notification-bell"
      onClick={onOpen}
      aria-label={`Benachrichtigungen (${unread} ungelesen)`}
      className="relative w-11 h-11 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all duration-100"
    >
      <Bell className="w-5 h-5" />
      {unread > 0 && (
        <span
          data-testid="notification-badge"
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none tabular-nums shadow-md shadow-red-500/30"
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );
}
