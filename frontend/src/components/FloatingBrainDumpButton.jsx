import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import BrainDumpSheet from './grocery/BrainDumpSheet';

const SHOPPING_SUBTAB_STORAGE_KEY = 'shopping-subtab';
const SHOPPING_SUBTAB_TO_MODE = {
  grocery: 'grocery',
  sonstiges: 'misc',
  asia: 'asia',
};

const ROUTE_MODE = {
  '/tasks': 'todos',
  '/chores': 'todos',
  '/expenses': 'expense',
};

function resolveMode(pathname) {
  if (pathname === '/shopping') {
    const subTab = localStorage.getItem(SHOPPING_SUBTAB_STORAGE_KEY) || 'grocery';
    return SHOPPING_SUBTAB_TO_MODE[subTab] || 'grocery';
  }
  return ROUTE_MODE[pathname] || null;
}

export default function FloatingBrainDumpButton() {
  const { pathname } = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);
  // Re-render when sub-tab changes (ShoppingTab dispatches a custom event on
  // setSubTab via the storage write — we listen to 'storage' for cross-tab
  // sync and to a custom 'shopping-subtab-change' for same-tab re-evaluation
  // since localStorage 'storage' events don't fire in the originating tab).
  const [subTabTick, setSubTabTick] = useState(0);
  React.useEffect(() => {
    const handler = () => setSubTabTick((t) => t + 1);
    window.addEventListener('shopping-subtab-change', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('shopping-subtab-change', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  // eslint-disable-next-line no-unused-vars
  const _ = subTabTick; // force re-eval of resolveMode on sub-tab change
  const mode = resolveMode(pathname);
  if (!mode) return null;

  return (
    <>
      <button
        onClick={() => setSheetOpen(true)}
        className="fixed z-40 w-14 h-14 rounded-full bg-blue-500 shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        style={{
          bottom: 'calc(80px + env(safe-area-inset-bottom) + 16px)',
          right: '16px',
        }}
        aria-label="AI Braindump öffnen"
      >
        <Sparkles className="w-6 h-6 text-white" />
      </button>

      <BrainDumpSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        mode={mode}
      />
    </>
  );
}
