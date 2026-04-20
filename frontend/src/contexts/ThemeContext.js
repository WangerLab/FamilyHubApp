import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

const getSystemTheme = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'auto');

  const resolvedTheme = mode === 'auto' ? getSystemTheme() : mode;

  // Apply dark class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  // Follow system changes when in auto mode
  useEffect(() => {
    if (mode !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      document.documentElement.classList.toggle('dark', e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prev) => {
      let next;
      if (prev === 'auto') {
        next = resolvedTheme === 'dark' ? 'light' : 'dark';
      } else if (prev === 'dark') {
        next = 'light';
      } else {
        next = 'dark';
      }
      localStorage.setItem('themeMode', next);
      return next;
    });
  };

  const resetToAuto = () => {
    localStorage.removeItem('themeMode');
    setMode('auto');
  };

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, toggleTheme, resetToAuto }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
