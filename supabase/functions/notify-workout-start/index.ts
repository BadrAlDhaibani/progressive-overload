// Provolone — notify-workout-start edge function
//
// Authenticated POST endpoint. Invoked fire-and-forget by the client when a
// user completes the first set of a workout. Fans out Expo push notifications
// to each accepted friend of the actor, filtered by:
//   1. actor's own `notification_prefs.send_enabled` ("silent workout")
//   2. the per-friend mute column on the friendships row (one-way)
//   3. recipient's `notification_prefs.receive_enabled`
//   4. a 2-hour (actor → recipient) dedup window via notifications_sent
//
// Required platform secrets:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (auto-injected)
//
// Deployed with verify_jwt=false because this project's auth uses ES256
// (asymmetric JWT signing). We validate the caller's JWT in code below via
// admin.auth.getUser(jwt), matching the delete-account function.

import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_BATCH = 100;
const DEDUP_WINDOW_HOURS = 2;

type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
};

type ExpoPushTicket = { status: 'ok' | 'error'; id?: string; message?: string };

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'method not allowed' });
  }

  try {
    const auth = req.headers.get('Authorization') ?? '';
    const jwt = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : '';
    if (!jwt) return json(401, { error: 'missing bearer token' });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: getUserErr } = await admin.auth.getUser(jwt);
    if (getUserErr || !userData?.user) {
      return json(401, { error: 'invalid token' });
    }
    const actorId = userData.user.id;

    // 1. Actor's send pref (missing row = default true).
    const { data: actorPrefs } = await admin
      .from('notification_prefs')
      .select('send_enabled')
      .eq('user_id', actorId)
      .maybeSingle();
    if (actorPrefs && actorPrefs.send_enabled === false) {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // 2. Accepted friends with the viewer's mute flag resolved.
    const { data: friends, error: friendsErr } = await admin
      .from('friendships')
      .select('requester_id, recipient_id, mute_by_requester, mute_by_recipient')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${actorId},recipient_id.eq.${actorId}`);
    if (friendsErr) {
      console.error('friendships query failed', friendsErr);
      return json(500, { error: 'friendship lookup failed' });
    }

    const candidateIds: string[] = [];
    for (const f of friends ?? []) {
      const actorIsRequester = f.requester_id === actorId;
      const recipientId = actorIsRequester ? f.recipient_id : f.requester_id;
      // Mute belongs to the *recipient* of this push (i.e. the friend), so we
      // read the column that corresponds to their side of the row.
      const muted = actorIsRequester ? f.mute_by_recipient : f.mute_by_requester;
      if (!muted) candidateIds.push(recipientId);
    }

    if (candidateIds.length === 0) {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // 3. Recipient receive_enabled filter.
    const { data: recipientPrefs } = await admin
      .from('notification_prefs')
      .select('user_id, receive_enabled')
      .in('user_id', candidateIds);
    const disabled = new Set(
      (recipientPrefs ?? [])
        .filter((p) => p.receive_enabled === false)
        .map((p) => p.user_id as string),
    );

    // 4. 2h dedup lookback.
    const cutoff = new Date(Date.now() - DEDUP_WINDOW_HOURS * 3600 * 1000).toISOString();
    const { data: recent } = await admin
      .from('notifications_sent')
      .select('recipient_id')
      .eq('actor_id', actorId)
      .in('recipient_id', candidateIds)
      .gte('sent_at', cutoff);
    const recentlyPushed = new Set((recent ?? []).map((r) => r.recipient_id as string));

    const finalRecipients = candidateIds.filter(
      (id) => !disabled.has(id) && !recentlyPushed.has(id),
    );

    if (finalRecipients.length === 0) {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // 5. Tokens + actor display copy.
    const { data: tokens } = await admin
      .from('push_tokens')
      .select('expo_token, user_id')
      .in('user_id', finalRecipients);
    if (!tokens || tokens.length === 0) {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const { data: actorProfile } = await admin
      .from('profiles')
      .select('username, display_name')
      .eq('id', actorId)
      .maybeSingle();
    const handle = actorProfile?.username ?? 'a friend';
    const body = `@${handle} started a workout`;

    // 6. Send. Track per-user success so dedup rows only go in after an ok ticket.
    const successful = new Set<string>();
    for (let i = 0; i < tokens.length; i += EXPO_PUSH_BATCH) {
      const batchTokens = tokens.slice(i, i + EXPO_PUSH_BATCH);
      const messages: ExpoMessage[] = batchTokens.map((t) => ({
        to: t.expo_token as string,
        title: 'Provolone',
        body,
        data: { kind: 'workout_start', actor_id: actorId },
      }));

      let res: Response;
      try {
        res = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify(messages),
        });
      } catch (e) {
        console.warn('expo push fetch threw', e);
        continue;
      }
      if (!res.ok) {
        console.warn('expo push non-2xx', res.status, await res.text());
        continue;
      }
      const payload = (await res.json()) as { data?: ExpoPushTicket[] };
      const tickets = payload.data ?? [];
      tickets.forEach((ticket, idx) => {
        if (ticket.status === 'ok') {
          successful.add(batchTokens[idx].user_id as string);
        } else {
          console.warn('expo push ticket error', ticket.message);
        }
      });
    }

    // 7. Dedup rows for users that got at least one ok ticket.
    if (successful.size > 0) {
      const rows = [...successful].map((uid) => ({
        actor_id: actorId,
        recipient_id: uid,
      }));
      const { error: dedupErr } = await admin.from('notifications_sent').insert(rows);
      if (dedupErr) console.warn('dedup insert failed', dedupErr);
    }

    return new Response(null, { status: 204, headers: CORS_HEADERS });
  } catch (e) {
    console.error('notify-workout-start unhandled error', e);
    return json(500, { error: 'internal error' });
  }
});
