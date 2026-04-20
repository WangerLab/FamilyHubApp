import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { House, ShoppingCart, CheckSquare, RefreshCw, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const TABS = [
  { id: 'home', label: 'Home', icon: House, path: '/home' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingCart, path: '/shopping' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, path: '/tasks' },
  { id: 'chores', label: 'Chores', icon: RefreshCw, path: '/chores' },
  { id: 'more', label: 'More', icon: MoreHorizontal, path: '/more' },
];

export default function BottomNav() {
  const { member } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const userColor = member?.color || '#3B82F6';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl max-w-[412px] mx-auto"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Bottom navigation"
    >
      {TABS.map(({ id, label, icon: Icon, path }) => {
        const isActive = location.pathname === path || (location.pathname === '/' && path === '/home');
        return (
          <button
            key={id}
            data-testid={`bottom-nav-${id}`}
            onClick={() => navigate(path)}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            className="flex flex-col items-center justify-center flex-1 min-h-[64px] py-2 active:scale-95 transition-transform duration-100"
            style={{ minWidth: 0 }}
          >
            <Icon
              className="w-6 h-6 transition-colors duration-150"
              style={{ color: isActive ? userColor : undefined }}
              strokeWidth={isActive ? 2.5 : 1.8}
            />
            <span
              className="text-[10px] font-medium mt-1 transition-colors duration-150"
              style={{
                color: isActive ? userColor : undefined,
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              {label}
            </span>
            {isActive && (
              <span
                className="absolute bottom-0 w-6 h-0.5 rounded-full"
                style={{ backgroundColor: userColor, bottom: `calc(env(safe-area-inset-bottom) + 2px)` }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
