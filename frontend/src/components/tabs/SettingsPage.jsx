import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Palette, Check, ArrowLeft, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const PRESET_COLORS = [
  { label: "Tim Pink", value: "#EC4899" },
  { label: "Iris Blau", value: "#2563EB" },
  { label: "Emerald", value: "#10B981" },
  { label: "Amber", value: "#F59E0B" },
  { label: "Violet", value: "#8B5CF6" },
  { label: "Cyan", value: "#06B6D4" },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { member, signOut, updateMemberColor, updateDisplayName } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(member?.display_name || '');
  const [savingName, setSavingName] = useState(false);
  const [savingColor, setSavingColor] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const color = member?.color || '#3B82F6';

  const handleSaveName = async () => {
    if (!nameInput.trim() || nameInput.trim() === member?.display_name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    await updateDisplayName(nameInput.trim());
    setSavingName(false);
    setEditingName(false);
  };

  const handleColorChange = async (newColor) => {
    setSavingColor(true);
    await updateMemberColor(newColor);
    setSavingColor(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut();
  };

  return (
    <div
      data-testid="settings-page"
      className="space-y-6 pb-4"
      style={{ fontFamily: 'DM Sans, sans-serif' }}
    >
      {/* Page header with back button */}
      <div className="flex items-center gap-3 pt-3 pb-1">
        <button
          onClick={() => navigate('/home')}
          className="p-2 -ml-2 rounded-lg active:opacity-70"
          aria-label="Zurück"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-slate-500" />
          <h1
            className="text-xl font-bold text-slate-900 dark:text-slate-50"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Einstellungen
          </h1>
        </div>
      </div>

      {/* Profile section */}
      <section className="space-y-1">
        <h3
          className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Profil
        </h3>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Avatar + Name */}
          <div className="flex items-center gap-4 px-4 py-4 border-b border-slate-100 dark:border-slate-800">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
              style={{ backgroundColor: color }}
            >
              {member?.display_name?.slice(0, 2).toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400 mb-0.5">Anzeigename</p>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    data-testid="display-name-input"
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    autoFocus
                    className="flex-1 text-base font-semibold bg-transparent border-b-2 border-blue-500 outline-none text-slate-900 dark:text-slate-50"
                  />
                  <button
                    data-testid="save-display-name-button"
                    onClick={handleSaveName}
                    disabled={savingName}
                    className="text-blue-500 font-medium text-sm"
                  >
                    {savingName ? '…' : 'Speichern'}
                  </button>
                </div>
              ) : (
                <button
                  data-testid="edit-display-name-button"
                  onClick={() => { setNameInput(member?.display_name || ''); setEditingName(true); }}
                  className="text-base font-semibold text-slate-900 dark:text-slate-50 active:opacity-60 transition-opacity"
                >
                  {member?.display_name || '—'}
                </button>
              )}
            </div>
          </div>

          {/* Color picker */}
          <div className="px-4 py-4">
            <p className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              Deine Farbe
            </p>
            <div className="flex flex-wrap gap-3">
              {PRESET_COLORS.map(({ label, value }) => (
                <button
                  key={value}
                  data-testid={`color-swatch-${value.replace('#', '')}`}
                  onClick={() => handleColorChange(value)}
                  disabled={savingColor}
                  aria-label={label}
                  className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform duration-100 relative"
                  style={{ backgroundColor: value }}
                >
                  {color === value && (
                    <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Account section */}
      <section className="space-y-1">
        <h3
          className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Konto
        </h3>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-4 py-3.5 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800">
              <User className="w-5 h-5 text-slate-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400">Angemeldet als</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">
                {member?.display_name || '—'}
              </p>
            </div>
          </div>

          <button
            data-testid="logout-button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-3 w-full px-4 py-3.5 text-left active:bg-red-50 dark:active:bg-red-950/20 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-50 dark:bg-red-950/30">
              <LogOut className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-sm font-medium text-red-500 flex-1">
              {loggingOut ? 'Abmelden…' : 'Abmelden'}
            </span>
          </button>
        </div>
      </section>

      {/* App info */}
      <div className="text-center py-2">
        <p className="text-xs text-slate-300 dark:text-slate-700">
          Wanger Family Hub v1.0
        </p>
      </div>
    </div>
  );
}
