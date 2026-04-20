import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ensureProfile, getProfile } from '@/lib/social/profiles';
import type { Profile } from '@/lib/social/types';

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
    if (isSupabaseConfigured) await supabase.auth.signOut();
    set({ status: 'signed-out', userId: null, profile: null });
  },
}));
