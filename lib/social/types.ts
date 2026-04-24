export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  profile_color: string | null;
  created_at: string;
  updated_at: string;
};

export type LeaderboardMetric = 'workouts' | 'volume' | 'duration';

export type LeaderboardRow = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  profile_color: string | null;
  workouts_count: number;
  volume_lbs: number;
  duration_seconds: number;
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

export type FriendshipStatus = 'pending' | 'accepted';

export type Friendship = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
};

export type FriendProfile = Pick<
  Profile,
  'id' | 'username' | 'display_name' | 'avatar_url' | 'profile_color'
>;

export type FriendRequest = {
  id: string;
  direction: 'incoming' | 'outgoing';
  created_at: string;
  other: FriendProfile;
};

export type Friend = {
  friendship_id: string;
  since: string;
  profile: FriendProfile;
};
