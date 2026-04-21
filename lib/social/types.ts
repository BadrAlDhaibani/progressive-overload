export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type LeaderboardMetric = 'workouts' | 'volume' | 'duration';

export type LeaderboardRow = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  workouts_count: number;
  volume_lbs: number;
  duration_seconds: number;
};

export type ChatSummary = {
  id: string;
  last_message_at: string;
  other: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>;
  preview: string | null;
};

export type ChatMessage = {
  id: string;
  chat_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type WeeklyStatsInput = {
  workouts_count: number;
  volume_lbs: number;
  duration_seconds: number;
};
