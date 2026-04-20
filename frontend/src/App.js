import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import AppShell from './components/AppShell';
import './App.css';

function LoadingScreen() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-500 animate-pulse" />
        <p className="text-sm text-slate-400" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          Loading…
        </p>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginPage />;
  return <AppShell />;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
