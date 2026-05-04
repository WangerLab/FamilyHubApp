// Google OAuth helpers — initiation + return-trip verification.
// CSRF protection: state carries { user_id, nonce } base64-encoded; nonce
// is mirrored in sessionStorage and checked on return.

const NONCE_KEY = 'google-oauth-nonce';
const SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
].join(' ');

/**
 * Initiates the OAuth flow by redirecting to Google's consent screen.
 * Stores a nonce in sessionStorage; verifyOAuthReturn() checks it on return.
 */
export function startGoogleOAuth(userId) {
  if (!userId) return;

  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  const redirectUri = process.env.REACT_APP_GOOGLE_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    console.warn('[googleAuth] missing REACT_APP_GOOGLE_CLIENT_ID or REACT_APP_GOOGLE_REDIRECT_URI');
    return;
  }

  const nonce = (window.crypto && window.crypto.randomUUID)
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  sessionStorage.setItem(NONCE_KEY, nonce);

  const state = btoa(JSON.stringify({ user_id: userId, nonce }));

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',   // required for refresh_token
    prompt: 'consent',        // forces refresh_token even on re-connect
    state,
    include_granted_scopes: 'true',
  });

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Reads URL query params after Google redirect and validates nonce.
 * Returns { status: 'connected' | 'error' | null, reason?: string }.
 * Caller is expected to clean the URL afterwards (history.replaceState).
 */
export function verifyOAuthReturn() {
  if (typeof window === 'undefined') return { status: null };

  const params = new URLSearchParams(window.location.search);
  const google = params.get('google');

  if (google === 'connected') {
    const returnedNonce = params.get('nonce');
    const storedNonce = sessionStorage.getItem(NONCE_KEY);
    sessionStorage.removeItem(NONCE_KEY);
    if (!returnedNonce || returnedNonce !== storedNonce) {
      return { status: 'error', reason: 'nonce_mismatch' };
    }
    return { status: 'connected' };
  }

  if (google === 'error') {
    sessionStorage.removeItem(NONCE_KEY);
    return { status: 'error', reason: params.get('reason') || 'unknown' };
  }

  return { status: null };
}
