import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import {
  cancelRestComplete,
  ensureNotificationPermission,
  scheduleRestComplete,
} from '@/lib/restNotifications';

const STORAGE_KEY = 'provolone.rest.defaultSeconds';
const DEFAULT_REST_SECONDS = 120;
const MIN_REST_SECONDS = 5;

interface TimerState {
  isRunning: boolean;
  endsAtMs: number | null;
  totalSeconds: number;
  defaultSeconds: number;
  notificationId: string | null;
  exerciseName: string;

  start: (seconds?: number, exerciseName?: string) => Promise<void>;
  cancel: () => Promise<void>;
  addSeconds: (delta: number) => Promise<void>;
  setDefault: (seconds: number) => Promise<void>;
  hydrateDefault: () => Promise<void>;
}

export const useTimerStore = create<TimerState>()((set, get) => ({
  isRunning: false,
  endsAtMs: null,
  totalSeconds: 0,
  defaultSeconds: DEFAULT_REST_SECONDS,
  notificationId: null,
  exerciseName: '',

  start: async (seconds, exerciseName) => {
    const state = get();
    const target = Math.max(MIN_REST_SECONDS, seconds ?? state.defaultSeconds);

    if (state.notificationId) {
      await cancelRestComplete(state.notificationId);
    }

    await ensureNotificationPermission();
    const notificationId = await scheduleRestComplete(target);

    set({
      isRunning: true,
      endsAtMs: Date.now() + target * 1000,
      totalSeconds: target,
      notificationId,
      exerciseName: exerciseName ?? '',
    });
  },

  cancel: async () => {
    const { notificationId } = get();
    if (notificationId) {
      await cancelRestComplete(notificationId);
    }
    set({
      isRunning: false,
      endsAtMs: null,
      totalSeconds: 0,
      notificationId: null,
      exerciseName: '',
    });
  },

  addSeconds: async (delta) => {
    const state = get();
    if (!state.isRunning || !state.endsAtMs) return;

    const remainingMs = state.endsAtMs - Date.now();
    const nextRemainingSeconds = Math.max(
      MIN_REST_SECONDS,
      Math.round(remainingMs / 1000) + delta,
    );
    const nextTotalSeconds = Math.max(
      MIN_REST_SECONDS,
      state.totalSeconds + delta,
    );

    if (state.notificationId) {
      await cancelRestComplete(state.notificationId);
    }
    const notificationId = await scheduleRestComplete(nextRemainingSeconds);

    set({
      endsAtMs: Date.now() + nextRemainingSeconds * 1000,
      totalSeconds: nextTotalSeconds,
      notificationId,
    });

    // Tap-to-edit IS preference editing — the new total becomes the new default.
    void get().setDefault(nextTotalSeconds);
  },

  setDefault: async (seconds) => {
    const clamped = Math.max(MIN_REST_SECONDS, Math.round(seconds));
    set({ defaultSeconds: clamped });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, String(clamped));
    } catch {
      /* best-effort */
    }
  },

  hydrateDefault: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw === null) return;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < MIN_REST_SECONDS) return;
      set({ defaultSeconds: Math.round(parsed) });
    } catch {
      /* keep DEFAULT_REST_SECONDS */
    }
  },
}));
