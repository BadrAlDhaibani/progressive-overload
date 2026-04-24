import { create } from 'zustand';

export type TabName = 'home' | 'history' | 'exercises' | 'friends';
export type FriendsSegment = 'leaderboard' | 'friends';

const TAB_INDEX: Record<TabName, number> = {
  home: 0,
  history: 1,
  exercises: 2,
  friends: 3,
};

interface TabNavState {
  pendingTab: TabName | null;
  pendingSegment: FriendsSegment | null;
  requestTab: (tab: TabName, segment?: FriendsSegment) => void;
  consumeTab: () => TabName | null;
  consumeSegment: () => FriendsSegment | null;
}

export const useTabNavStore = create<TabNavState>((set, get) => ({
  pendingTab: null,
  pendingSegment: null,
  requestTab: (tab, segment) => {
    set({ pendingTab: tab, pendingSegment: segment ?? null });
  },
  consumeTab: () => {
    const current = get().pendingTab;
    if (current) set({ pendingTab: null });
    return current;
  },
  consumeSegment: () => {
    const current = get().pendingSegment;
    if (current) set({ pendingSegment: null });
    return current;
  },
}));

export const tabNameToIndex = (tab: TabName): number => TAB_INDEX[tab];
