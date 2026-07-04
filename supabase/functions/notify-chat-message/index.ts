// Provolone — notify-chat-message edge function
//
// Called server-side by the pg_net trigger on public.messages insert (see
// 0009_chat_message_notifications.sql) — never invoked by the client. Auth is
// a shared-secret header (CHAT_NOTIFY_SECRET); deployed with verify_jwt=false
// because the caller is Postgres, not a user.
//
// Sends one Expo push to the other member of the 1:1 chat, unless:
//   1. the recipient muted the sender on their friendships row (one-way mute;
//      a chat can predate the friendship — no friendship row means not muted)
//   2. recipient `notification_prefs.receive_enabled = false`
// No dedup window — every message notifies. When the recipient already has
// the thread open in the foreground, the client suppresses the banner.
//
// Required secrets:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (auto-injected)
//   CHAT_NOTIFY_SECRET                       (set via `supabase secrets set`)

import { createClient } from '@supabase/supabase-js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BODY_PREVIEW_MAX = 120;

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
    headers: { 'content-type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'method not allowed' });
  }

  try {
    const secret = Deno.env.get('CHAT_NOTIFY_SECRET') ?? '';
    const provided = req.headers.get('x-chat-notify-secret') ?? '';
    if (!secret || provided !== secret) {
      return json(401, { error: 'unauthorized' });
    }

    const payload = (await req.json()) as {
      chat_id?: string;
      sender_id?: string;
      body?: string;
    };
    const chatId = payload.chat_id;
    const senderId = payload.sender_id;
    const messageBody = payload.body;
    if (!chatId || !senderId || !messageBody) {
      return json(400, { error: 'missing chat_id, sender_id, or body' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. The other member of the 1:1 chat.
    const { data: members, error: membersErr } = await admin
      .from('chat_members')
      .select('user_id')
      .eq('chat_id', chatId)
      .neq('user_id', senderId);
    if (membersErr) {
      console.error('chat_members query failed', membersErr);
      return json(500, { error: 'chat member lookup failed' });
    }
    const recipientId = members?.[0]?.user_id as string | undefined;
    if (!recipientId) {
      return new Response(null, { status: 204 });
    }

    // 2. Recipient receive pref (missing row = default true).
    const { data: prefs } = await admin
      .from('notification_prefs')
      .select('receive_enabled')
      .eq('user_id', recipientId)
      .maybeSingle();
    if (prefs && prefs.receive_enabled === false) {
      return new Response(null, { status: 204 });
    }

    // 3. Per-friend mute. Mute belongs to the recipient of this push, so read
    // the column for their side of the friendships row (same semantics as
    // notify-workout-start). No accepted friendship row = not muted.
    const { data: friendship } = await admin
      .from('friendships')
      .select('requester_id, mute_by_requester, mute_by_recipient')
      .eq('status', 'accepted')
      .or(
        `and(requester_id.eq.${senderId},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${senderId})`,
      )
      .maybeSingle();
    if (friendship) {
      const muted =
        friendship.requester_id === recipientId
          ? friendship.mute_by_requester
          : friendship.mute_by_recipient;
      if (muted) {
        return new Response(null, { status: 204 });
      }
    }

    // 4. Recipient tokens + sender handle.
    const { data: tokens } = await admin
      .from('push_tokens')
      .select('expo_token')
      .eq('user_id', recipientId);
    if (!tokens || tokens.length === 0) {
      return new Response(null, { status: 204 });
    }

    const { data: senderProfile } = await admin
      .from('profiles')
      .select('username')
      .eq('id', senderId)
      .maybeSingle();
    const handle = senderProfile?.username ?? 'a friend';

    const preview =
      messageBody.length > BODY_PREVIEW_MAX
        ? `${messageBody.slice(0, BODY_PREVIEW_MAX - 1)}…`
        : messageBody;

    // 5. Send. A single user has at most a handful of devices — one batch.
    const messages: ExpoMessage[] = tokens.map((t) => ({
      to: t.expo_token as string,
      title: `@${handle}`,
      body: preview,
      data: { kind: 'chat_message', chat_id: chatId },
    }));

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      console.warn('expo push non-2xx', res.status, await res.text());
    } else {
      const result = (await res.json()) as { data?: ExpoPushTicket[] };
      (result.data ?? []).forEach((ticket) => {
        if (ticket.status !== 'ok') {
          console.warn('expo push ticket error', ticket.message);
        }
      });
    }

    return new Response(null, { status: 204 });
  } catch (e) {
    console.error('notify-chat-message unhandled error', e);
    return json(500, { error: 'internal error' });
  }
});
