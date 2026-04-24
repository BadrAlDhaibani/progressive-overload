import { create } from 'zustand';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ensureProfile, getProfile } from '@/lib/social/profiles';
import { registerForPushNotifications, unregisterPushToken } from '@/lib/notifications';
import type { Profile } from '@/lib/social/types';

async function formatInvokeError(error: unknown): Promise<string> {
  if (!(error instanceof Error)) return 'Unknown error';
  let detail = error.message || 'Unknown error';
  if (!(error instanceof FunctionsHttpError)) return detail;
  const res = error.context as Response | undefined;
  if (!res) return detail;
  if (typeof res.status === 'number') detail += ` (HTTP ${res.status})`;
  try {
    const body = await res.text();
    if (!body) return detail;
    try {
      const parsed = JSON.parse(body);
      if (parsed?.error) detail += ` — ${parsed.error}`;
      if (parsed?.detail) detail += ` (${parsed.detail})`;
    } catch {
      if (body.length < 300) detail += ` — ${body}`;
    }
  } catch {
    // body unreadable; fall back to status only
  }
  return detail;
}

type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

interface AuthState {
  status: AuthStatus;
  userId: string | null;
  profile: Profile | null;
  error: string | null;

  init: () => Promise<void>;
  setSession: (userId: string | null, displayName: string | null) => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: 'loading',
  userId: null,
  profile: null,
  error: null,

  init: async () => {
    if (!isSupabaseConfigured) {
      set({ status: 'signed-out', error: null });
      return;
    }
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) {
      set({ status: 'signed-out', userId: null, profile: null });
      return;
    }
    await get().setSession(session.user.id, session.user.user_metadata?.full_name ?? null);

    supabase.auth.onAuthStateChange((_event, next) => {
      if (next?.user) {
        get().setSession(next.user.id, next.user.user_metadata?.full_name ?? null);
      } else {
        set({ status: 'signed-out', userId: null, profile: null });
      }
    });
  },

  setSession: async (userId, displayName) => {
    if (!userId) {
      set({ status: 'signed-out', userId: null, profile: null });
      return;
    }
    try {
      const profile = await ensureProfile(userId, displayName);
      set({ status: 'signed-in', userId, profile, error: null });
      registerForPushNotifications(userId).catch(() => {
        /* push registration is best-effort; never block sign-in */
      });
    } catch (e: any) {
      set({ status: 'signed-out', error: e?.message ?? 'Could not load profile.' });
    }
  },

  refreshProfile: async () => {
    const id = get().userId;
    if (!id) return;
    const profile = await getProfile(id);
    if (profile) set({ profile });
  },

  signOut: async () => {
    // Unregister this device's push token while the session is still valid,
    // so RLS authorizes the delete. Best-effort — swallow errors so sign-out
    // always completes.
    await unregisterPushToken().catch(() => {});
    if (isSupabaseConfigured) await supabase.auth.signOut();
    set({ status: 'signed-out', userId: null, profile: null });
  },

  deleteAccount: async () => {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const { error } = await supabase.functions.invoke('delete-account', {
      method: 'POST',
    });
    if (error) throw new Error(await formatInvokeError(error));
    await get().signOut();
  },
}));
