import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Share } from 'lucide-react';
import { GroceryProvider } from '../contexts/GroceryContext';
import { MiscProvider } from '../contexts/MiscContext';
import { AsiaProvider } from '../contexts/AsiaContext';
import { TodosProvider } from '../contexts/TodosContext';
import { ChoresProvider } from '../contexts/ChoresContext';
import { ActivityProvider } from '../contexts/ActivityContext';
import { ExpensesProvider } from '../contexts/ExpensesContext';
import { ProjectsProvider } from '../contexts/ProjectsContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { triggerCalendarSync } from '../lib/googleAuth';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import HomeTab from './tabs/HomeTab';
import ShoppingTab from './tabs/ShoppingTab';
import TasksTab from './tabs/TasksTab';
import ChoresTab from './tabs/ChoresTab';
import SettingsPage from './tabs/SettingsPage';
import CalendarPage from './tabs/CalendarPage';
import ExpensesTab from './tabs/ExpensesTab';
import StatisticsPage from './home/StatisticsPage';
import FloatingBrainDumpButton from './FloatingBrainDumpButton';

export default function AppShell() {
  const { user } = useAuth();
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [showAndroidBanner, setShowAndroidBanner] = useState(false);
  const [showIOSBanner, setShowIOSBanner] = useState(false);

  // Auto-sync calendar once per user.id mount, throttled at 5 minutes via localStorage.
  // Mark-before-call prevents a slow sync from being re-triggered by a quick remount.
  // Failures don't reset the throttle (no tight retry loops); manual button still works.
  useEffect(() => {
    if (!user?.id) return;

    const THROTTLE_MS = 5 * 60 * 1000; // 5 minutes
    const STORAGE_KEY = 'calendar-last-sync-at';

    const lastSyncStr = localStorage.getItem(STORAGE_KEY);
    const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
    const now = Date.now();

    if (now - lastSync < THROTTLE_MS) return; // Throttled

    // Mark BEFORE the call so a slow sync doesn't get re-triggered by
    // a quick remount of AppShell.
    localStorage.setItem(STORAGE_KEY, String(now));

    triggerCalendarSync(supabase)
      .then((result) => {
        console.log('[autosync] ok:', result.events_synced, 'events');
      })
      .catch((e) => {
        console.warn('[autosync] failed:', e.message);
        // Don't reset the throttle on failure — prevents tight retry loops.
        // Manual button still works.
      });
  }, [user?.id]);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone;

    if (isStandalone) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const iosDismissed = localStorage.getItem('iosPromptDismissed');
    if (isIOS && !iosDismissed) {
      setShowIOSBanner(true);
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
      setShowAndroidBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleAndroidInstall = async () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    await installPromptEvent.userChoice;
    setShowAndroidBanner(false);
    setInstallPromptEvent(null);
  };

  const dismissIOSBanner = () => {
    localStorage.setItem('iosPromptDismissed', '1');
    setShowIOSBanner(false);
  };

  return (
    <ActivityProvider>
    <GroceryProvider>
    <MiscProvider>
    <AsiaProvider>
    <TodosProvider>
    <ChoresProvider>
    <ExpensesProvider>
    <ProjectsProvider>
    <div className="relative w-full sm:max-w-[480px] mx-auto min-h-[100dvh] flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Top bar */}
      <TopBar />

      {/* iOS install banner */}
      {showIOSBanner && (
        <div
          data-testid="ios-install-banner"
          className="fixed top-0 left-0 right-0 z-40 sm:max-w-[480px] mx-auto"
          style={{ top: 'calc(64px + env(safe-area-inset-top))' }}
        >
          <div className="mx-3 mt-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 p-3 flex items-start gap-3 shadow-lg">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0 mt-0.5">
              <Share className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Add to Home Screen</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                Tap the Share button below, then "Add to Home Screen" to install this app.
              </p>
            </div>
            <button
              onClick={dismissIOSBanner}
              className="text-blue-400 dark:text-blue-500 text-lg leading-none shrink-0 w-8 h-8 flex items-center justify-center active:opacity-60"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Android install banner */}
      {showAndroidBanner && (
        <div
          data-testid="android-install-banner"
          className="fixed top-0 left-0 right-0 z-40 sm:max-w-[480px] mx-auto"
          style={{ top: 'calc(64px + env(safe-area-inset-top))' }}
        >
          <div className="mx-3 mt-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 p-3 flex items-center gap-3 shadow-lg">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200 flex-1">
              Install Wanger Family Hub on your device
            </p>
            <button
              data-testid="android-install-button"
              onClick={handleAndroidInstall}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-sm font-semibold active:scale-95 transition-transform"
            >
              Install
            </button>
            <button
              onClick={() => setShowAndroidBanner(false)}
              className="text-blue-400 text-lg leading-none shrink-0 w-8 h-8 flex items-center justify-center active:opacity-60"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main
        className="flex-1 overflow-y-auto"
        style={{
          paddingTop: 'calc(64px + env(safe-area-inset-top))',
          paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
          paddingLeft: '1rem',
          paddingRight: '1rem',
        }}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomeTab />} />
          <Route path="/shopping" element={<ShoppingTab />} />
          <Route path="/tasks" element={<TasksTab />} />
          <Route path="/chores" element={<ChoresTab />} />
          <Route path="/expenses" element={<ExpensesTab />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/more" element={<Navigate to="/settings" replace />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </main>

      {/* Floating Brain Dump Button */}
      <FloatingBrainDumpButton />

      {/* Bottom nav */}
      <BottomNav />
    </div>
    </ProjectsProvider>
    </ExpensesProvider>
    </ChoresProvider>
    </TodosProvider>
    </AsiaProvider>
    </MiscProvider>
    </GroceryProvider>
    </ActivityProvider>
  );
}
