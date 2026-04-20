import React, { useState } from 'react';
import { Home, Heart, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getRememberMe, setRememberMe } from '../supabaseClient';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => getRememberMe());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Persist preference BEFORE signIn so the custom storage adapter
      // routes the new session tokens to the correct storage.
      setRememberMe(remember);
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="w-full max-w-sm space-y-8">
        {/* Brand */}
        <div className="flex flex-col items-center space-y-3">
          <div className="relative w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Home className="w-8 h-8 text-white" />
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center">
              <Heart className="w-3 h-3 text-white fill-white" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50"
                style={{ fontFamily: 'Manrope, sans-serif' }}>
              Wanger Family Hub
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Your family, all in one place
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              data-testid="login-error"
              className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              data-testid="login-email-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full h-14 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base transition-colors"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              data-testid="login-password-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full h-14 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base transition-colors"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            />
          </div>

          <button
            type="button"
            data-testid="login-remember-toggle"
            onClick={() => setRemember((v) => !v)}
            aria-pressed={remember}
            className="w-full flex items-center gap-3 py-2 -my-1 active:opacity-70 transition-opacity"
          >
            <span
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                remember
                  ? 'bg-blue-500 border-blue-500'
                  : 'border-slate-300 dark:border-slate-600 bg-transparent'
              }`}
            >
              {remember && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
            </span>
            <span
              className="text-sm text-slate-600 dark:text-slate-300 select-none"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              Stay logged in
            </span>
          </button>

          <button
            type="submit"
            data-testid="login-submit-button"
            disabled={loading}
            className="w-full h-14 rounded-xl bg-blue-500 hover:bg-blue-600 active:scale-[0.97] text-white font-semibold text-base transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 mt-2"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 dark:text-slate-600">
          Private family app — no sign-up
        </p>
      </div>
    </div>
  );
}
