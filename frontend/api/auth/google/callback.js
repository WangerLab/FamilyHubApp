// Vercel Serverless Function — Google OAuth callback handler.
// Receives ?code=...&state=... after Google's consent screen, exchanges
// the code for tokens, persists them to google_oauth_tokens via service-role,
// then redirects the user back into the app at /settings.
//
// All error paths redirect — never return JSON. The user always lands inside
// the app, never on a raw API response.

import { createClient } from '@supabase/supabase-js';

function deriveRedirectBase() {
  const full = process.env.GOOGLE_REDIRECT_URI || '';
  // Strip the callback suffix to get the app origin.
  return full.replace(/\/api\/auth\/google\/callback\/?$/, '') || '';
}

function redirect(res, base, params) {
  const qs = new URLSearchParams(params).toString();
  res.writeHead(302, { Location: `${base}/settings?${qs}` });
  res.end();
}

export default async function handler(req, res) {
  const base = deriveRedirectBase();

  if (req.method !== 'GET') {
    return redirect(res, base, { google: 'error', reason: 'method_not_allowed' });
  }

  const { code, state, error } = req.query || {};

  if (error) {
    return redirect(res, base, { google: 'error', reason: String(error) });
  }
  if (!code || !state) {
    return redirect(res, base, { google: 'error', reason: 'missing_params' });
  }

  // Decode state: base64-encoded JSON { user_id, nonce }
  let user_id, nonce;
  try {
    const decoded = JSON.parse(Buffer.from(String(state), 'base64').toString('utf-8'));
    user_id = decoded.user_id;
    nonce = decoded.nonce;
    if (!user_id || !nonce) throw new Error('missing fields');
  } catch {
    return redirect(res, base, { google: 'error', reason: 'invalid_state' });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!clientId || !clientSecret || !redirectUri || !supabaseUrl || !serviceRoleKey) {
    return redirect(res, base, { google: 'error', reason: 'server_config' });
  }

  // Exchange code → tokens (form-encoded body, not JSON)
  let tokenData;
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });
    if (!tokenRes.ok) {
      const body = await tokenRes.text().catch(() => '');
      console.warn('[oauth] token exchange failed:', tokenRes.status, body.slice(0, 200));
      return redirect(res, base, { google: 'error', reason: 'token_exchange_failed' });
    }
    tokenData = await tokenRes.json();
  } catch (e) {
    console.warn('[oauth] token fetch exception:', e?.message);
    return redirect(res, base, { google: 'error', reason: 'token_network' });
  }

  const { access_token, refresh_token, expires_in, scope } = tokenData;

  if (!refresh_token) {
    // Happens when user already consented before without prompt=consent.
    // The frontend always sends prompt=consent, but be defensive.
    return redirect(res, base, { google: 'error', reason: 'no_refresh_token' });
  }

  // Best-effort: fetch user's Google email for display
  let google_email = null;
  try {
    const uRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (uRes.ok) {
      const userinfo = await uRes.json();
      google_email = userinfo?.email || null;
    }
  } catch {
    // Silent: column is nullable, not worth aborting
  }

  const expiry = new Date(Date.now() + (Number(expires_in) || 3600) * 1000).toISOString();

  // Persist via service-role (bypasses RLS — we trust the OAuth state we just verified)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: dbError } = await supabase
    .from('google_oauth_tokens')
    .upsert(
      {
        user_id,
        access_token,
        refresh_token,
        expiry,
        scope: scope || null,
        google_email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (dbError) {
    console.warn('[oauth] db upsert failed:', dbError.message);
    return redirect(res, base, { google: 'error', reason: 'db_write_failed' });
  }

  return redirect(res, base, { google: 'connected', nonce });
}
