import { supabase } from '@/lib/supabase';
import type { Profile } from './types';
import { generateUsername, isValidUsername, normalizeUsername } from './username';

export async function ensureProfile(userId: string, display: string | null): Promise<Profile> {
  const existing = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (existing.data) return existing.data as Profile;

  for (let attempt = 0; attempt < 5; attempt++) {
    const username = generateUsername();
    const { data, error } = await supabase
      .from('profiles')
      .insert({ id: userId, username, display_name: display })
      .select('*')
      .single();
    if (!error && data) return data as Profile;
    if (error && error.code !== '23505') throw error; // 23505 = unique violation, retry
  }
  throw new Error('Could not allocate a unique username — try again.');
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

export async function updateUsername(userId: string, next: string): Promise<Profile> {
  const candidate = normalizeUsername(next);
  if (!isValidUsername(candidate)) {
    throw new Error('3–24 chars. Letters, numbers, and underscores only.');
  }
  const { data, error } = await supabase
    .from('profiles')
    .update({ username: candidate, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('*')
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('That username is taken.');
    throw error;
  }
  return data as Profile;
}
