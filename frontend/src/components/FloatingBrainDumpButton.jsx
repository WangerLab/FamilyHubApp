import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import BrainDumpSheet from './grocery/BrainDumpSheet';

const ROUTE_MODE = {
  '/shopping': 'grocery',
  '/tasks': 'todos',
  '/chores': 'todos',
  '/expenses': 'expense',
};

export default function FloatingBrainDumpButton() {
  const { pathname } = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  const mode = ROUTE_MODE[pathname];
  if (!mode) return null;

  return (
    <>
      <button
        onClick={() => setSheetOpen(true)}
        className="fixed z-40 w-14 h-14 rounded-full bg-blue-500 shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        style={{
          bottom: 'calc(80px + env(safe-area-inset-bottom) + 16px)',
          right: 'calc(16px + max(0px, (100vw - 412px) / 2))',
        }}
        aria-label="KI Brain Dump öffnen"
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
