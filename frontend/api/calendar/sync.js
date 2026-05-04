// Vercel Serverless Function — Google Calendar sync.
// Verifies caller via Bearer JWT, looks up household_id server-side,
// refreshes OAuth tokens if needed, seeds user_calendar_preferences
// from Google's calendarList on first run, fetches events in a sliding
// time window, upserts into calendar_events, deletes stale rows.
//
// Per-caller scope: this run only touches the caller's tokens and
// the caller's own source_user_id rows. Iris must call separately.

import { createClient } from '@supabase/supabase-js';

const TIME_WINDOW_PAST_DAYS = 7;
const TIME_WINDOW_FUTURE_DAYS = 21;
const TOKEN_REFRESH_BUFFER_MS = 60 * 1000; // refresh if expiring within 60s

function err(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return err(res, 405, 'method_not_allowed', 'Use POST.');
  }

  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !googleClientId || !googleClientSecret) {
    return err(res, 500, 'server_config', 'Missing required env vars.');
  }

  // --- 1. Auth-Verifikation ---
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!bearer) {
    return err(res, 401, 'unauthorized', 'Missing Bearer token.');
  }

  const anonClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${bearer}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await anonClient.auth.getUser();
  if (userError || !userData?.user?.id) {
    return err(res, 401, 'unauthorized', 'Invalid token.');
  }
  const userId = userData.user.id;

  // --- 2. Setup: service-role client + household lookup ---
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: memberRow, error: memberError } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .single();
  if (memberError || !memberRow?.household_id) {
    return err(res, 403, 'no_household', 'User is not a household member.');
  }
  const householdId = memberRow.household_id;

  try {
    // --- 3. Token holen + ggf. refreshen ---
    const { data: tokenRow, error: tokenError } = await supabase
      .from('google_oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (tokenError) {
      console.error('[sync] token select failed:', tokenError.message);
      return err(res, 500, 'token_fetch_failed', tokenError.message);
    }
    if (!tokenRow) {
      return err(res, 400, 'not_connected', 'Google account not connected.');
    }

    let accessToken = tokenRow.access_token;
    const expiryMs = tokenRow.expiry ? new Date(tokenRow.expiry).getTime() : 0;
    if (expiryMs <= Date.now() + TOKEN_REFRESH_BUFFER_MS) {
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          refresh_token: tokenRow.refresh_token,
          grant_type: 'refresh_token',
        }).toString(),
      });
      if (!refreshRes.ok) {
        const body = await refreshRes.text().catch(() => '');
        console.warn('[sync] refresh failed:', refreshRes.status, body.slice(0, 200));
        return err(res, 401, 'refresh_failed', 'Token refresh rejected. Please reconnect.');
      }
      const refreshed = await refreshRes.json();
      accessToken = refreshed.access_token;
      const newExpiry = new Date(
        Date.now() + (Number(refreshed.expires_in) || 3600) * 1000
      ).toISOString();

      const updatePayload = {
        access_token: accessToken,
        expiry: newExpiry,
        updated_at: new Date().toISOString(),
      };
      // Google usually doesn't issue a new refresh_token on refresh — only overwrite if present.
      if (refreshed.refresh_token) {
        updatePayload.refresh_token = refreshed.refresh_token;
      }
      const { error: updErr } = await supabase
        .from('google_oauth_tokens')
        .update(updatePayload)
        .eq('user_id', userId);
      if (updErr) {
        console.error('[sync] token update failed:', updErr.message);
        // Non-fatal — we have the fresh access_token in memory and can still proceed.
      }
    }

    // --- 4. Kalender-Liste laden + Preferences seeden ---
    const { data: existingPrefs, error: prefsErr } = await supabase
      .from('user_calendar_preferences')
      .select('google_calendar_id')
      .eq('user_id', userId);
    if (prefsErr) {
      console.error('[sync] prefs select failed:', prefsErr.message);
      return err(res, 500, 'prefs_fetch_failed', prefsErr.message);
    }
    const knownCalIds = new Set((existingPrefs || []).map((p) => p.google_calendar_id));

    const calListRes = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!calListRes.ok) {
      const body = await calListRes.text().catch(() => '');
      console.warn('[sync] calendarList failed:', calListRes.status, body.slice(0, 200));
      return err(res, 502, 'calendar_list_failed', `Google ${calListRes.status}`);
    }
    const calListData = await calListRes.json();
    const newPrefs = (calListData.items || [])
      .filter((c) => c.id && !knownCalIds.has(c.id))
      .map((c) => ({
        user_id: userId,
        google_calendar_id: c.id,
        calendar_summary: c.summary || c.id,
        background_color: c.backgroundColor || null,
        is_active: true,
      }));
    if (newPrefs.length > 0) {
      const { error: insErr } = await supabase
        .from('user_calendar_preferences')
        .insert(newPrefs);
      if (insErr) {
        console.error('[sync] prefs insert failed:', insErr.message);
        return err(res, 500, 'prefs_insert_failed', insErr.message);
      }
    }

    const { data: activeCalendars, error: activeErr } = await supabase
      .from('user_calendar_preferences')
      .select('google_calendar_id, calendar_summary')
      .eq('user_id', userId)
      .eq('is_active', true);
    if (activeErr) {
      console.error('[sync] active prefs fetch failed:', activeErr.message);
      return err(res, 500, 'prefs_refetch_failed', activeErr.message);
    }

    // --- 5. Events laden für jeden aktiven Kalender ---
    const now = new Date();
    const timeMin = new Date(now.getTime() - TIME_WINDOW_PAST_DAYS * 86400 * 1000).toISOString();
    const timeMax = new Date(now.getTime() + TIME_WINDOW_FUTURE_DAYS * 86400 * 1000).toISOString();
    const syncStartedAt = now.toISOString();

    const eventsToUpsert = [];
    for (const cal of activeCalendars || []) {
      const url = new URL(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.google_calendar_id)}/events`
      );
      url.searchParams.set('timeMin', timeMin);
      url.searchParams.set('timeMax', timeMax);
      url.searchParams.set('singleEvents', 'true');
      url.searchParams.set('orderBy', 'startTime');
      url.searchParams.set('maxResults', '250');

      const evRes = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!evRes.ok) {
        console.warn('[sync] calendar fetch failed:', cal.google_calendar_id, evRes.status);
        continue;
      }
      const evData = await evRes.json();
      for (const item of evData.items || []) {
        if (item.status === 'cancelled') continue;
        if (!item.id) continue;

        const isAllDay = !!(item.start && item.start.date && !item.start.dateTime);
        const startRaw = item.start?.dateTime || item.start?.date;
        const endRaw = item.end?.dateTime || item.end?.date;
        if (!startRaw || !endRaw) continue;

        eventsToUpsert.push({
          household_id: householdId,
          google_event_id: item.id,
          google_calendar_id: cal.google_calendar_id,
          source_user_id: userId,
          summary: item.summary || null,
          description: item.description || null,
          location: item.location || null,
          start_time: new Date(startRaw).toISOString(),
          end_time: new Date(endRaw).toISOString(),
          is_all_day: isAllDay,
          color_id: item.colorId || null,
          status: item.status || null,
          last_synced_at: syncStartedAt,
        });
      }
    }

    // --- 6. Upsert in calendar_events ---
    if (eventsToUpsert.length > 0) {
      const { error: upErr } = await supabase
        .from('calendar_events')
        .upsert(eventsToUpsert, { onConflict: 'household_id,google_event_id' });
      if (upErr) {
        console.error('[sync] events upsert failed:', upErr.message);
        return err(res, 500, 'db_upsert_failed', upErr.message);
      }
    }

    // --- 7. Stale-Cleanup ---
    // Delete this user's events in the time window that weren't touched in this run —
    // they were deleted or moved out of the window in Google.
    const { error: delErr } = await supabase
      .from('calendar_events')
      .delete()
      .eq('household_id', householdId)
      .eq('source_user_id', userId)
      .lt('last_synced_at', syncStartedAt)
      .gte('start_time', timeMin)
      .lte('start_time', timeMax);
    if (delErr) {
      console.warn('[sync] stale cleanup failed:', delErr.message);
      // Non-fatal — sync still succeeded for the upsert path.
    }

    // --- 8. Response ---
    return res.status(200).json({
      ok: true,
      events_synced: eventsToUpsert.length,
      calendars_active: (activeCalendars || []).length,
      synced_at: syncStartedAt,
    });
  } catch (e) {
    console.error('[sync] unexpected:', e?.message, e?.stack);
    return err(res, 500, 'unexpected', e?.message || 'unknown');
  }
}
