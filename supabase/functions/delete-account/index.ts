// Provolone — delete-account edge function
//
// Authenticated POST endpoint. Given the caller's JWT, best-effort revokes
// their Apple refresh token (when applicable) and deletes their auth.users row.
// Cascade in 0001_friends_schema.sql + the cleanup trigger in 0002 fan the
// deletion out across profiles, weekly_stats, chat_members, messages, and
// orphaned 1:1 chats.
//
// Required platform secrets:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (auto-injected)
// Required Apple secrets (set via `supabase secrets set`):
//   APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_SERVICES_ID, APPLE_PRIVATE_KEY_P8
//
// Deployed with verify_jwt=false because this project's auth uses ES256
// (asymmetric JWT signing), which the edge function gateway's pre-verify
// step does not support. We validate the caller's JWT in code below via
// admin.auth.getUser(jwt) and 401 on missing/invalid tokens.

import { createClient } from '@supabase/supabase-js';
import { importPKCS8, SignJWT } from 'jose';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  });
}

async function buildAppleClientSecret(): Promise<string | null> {
  const teamId = Deno.env.get('APPLE_TEAM_ID');
  const keyId = Deno.env.get('APPLE_KEY_ID');
  const servicesId = Deno.env.get('APPLE_SERVICES_ID');
  const p8 = Deno.env.get('APPLE_PRIVATE_KEY_P8');
  if (!teamId || !keyId || !servicesId || !p8) {
    console.warn('Apple secrets not configured; skipping client_secret build');
    return null;
  }
  const key = await importPKCS8(p8, 'ES256');
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId, typ: 'JWT' })
    .setIssuer(teamId)
    .setIssuedAt(now)
    .setExpirationTime(now + 6 * 30 * 24 * 60 * 60)
    .setAudience('https://appleid.apple.com')
    .setSubject(servicesId)
    .sign(key);
}

function extractAppleRefreshToken(identities: unknown): string | null {
  if (!Array.isArray(identities)) return null;
  for (const identity of identities) {
    if (identity?.provider !== 'apple') continue;
    const data = identity?.identity_data ?? {};
    const candidate =
      data.provider_refresh_token ??
      data.refresh_token ??
      data.provider_token ??
      null;
    if (typeof candidate === 'string' && candidate.length > 0) return candidate;
  }
  return null;
}

async function revokeApple(refreshToken: string): Promise<void> {
  const clientId = Deno.env.get('APPLE_SERVICES_ID');
  const clientSecret = await buildAppleClientSecret();
  if (!clientId || !clientSecret) return;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    token: refreshToken,
    token_type_hint: 'refresh_token',
  });
  const res = await fetch('https://appleid.apple.com/auth/revoke', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    console.warn(`Apple /auth/revoke returned ${res.status}: ${await res.text()}`);
  }
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
      console.warn('getUser rejected JWT', getUserErr);
      return json(401, { error: 'invalid token' });
    }
    const user = userData.user;
    const provider = user.app_metadata?.provider;

    if (provider === 'apple') {
      const refreshToken = extractAppleRefreshToken(user.identities);
      if (refreshToken) {
        try {
          await revokeApple(refreshToken);
        } catch (e) {
          console.warn('Apple revoke threw; continuing with user delete', e);
        }
      } else {
        console.log('Apple user has no stored refresh token; skipping revoke');
      }
    }

    const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id);
    if (deleteErr) {
      console.error('admin.deleteUser failed', deleteErr);
      return json(500, { error: 'failed to delete user' });
    }

    return new Response(null, { status: 204, headers: CORS_HEADERS });
  } catch (e) {
    console.error('delete-account unhandled error', e);
    return json(500, { error: 'internal error' });
  }
});
