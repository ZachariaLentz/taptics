import dayjs from 'dayjs';
import { supabase } from './supabase';

export const getOrCreateUserProfile = async () => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) throw new Error('No user session found');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile) return profile;

  const { data: created, error: createError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      level: 1,
      xp: 0,
      streak: 0,
      last_played: null,
      last_daily_play: null,
      daily_correct: false,
    })
    .select()
    .single();

  if (createError) throw createError;

  return created;
};

export const updateDailyResult = async (correct: boolean) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const today = dayjs().format('YYYY-MM-DD');

  const { data: profile } = await supabase
    .from('profiles')
    .select('xp')
    .eq('id', user.id)
    .single();

  const newXP = correct ? (profile?.xp || 0) + 25 : (profile?.xp || 0);

  const { error } = await supabase
    .from('profiles')
    .update({
      last_daily_play: today,
      daily_correct: correct,
      xp: newXP,
    })
    .eq('id', user.id);

  if (error) console.error('Daily update error:', error);
};
