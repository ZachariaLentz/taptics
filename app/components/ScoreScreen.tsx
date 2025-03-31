import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@lib/supabase';
import { getOrCreateUserProfile } from '@lib/user';
import dayjs from 'dayjs';

export default function ScoreScreen() {
  const router = useRouter();
  const { level, result, correct } = useLocalSearchParams<{
    level: string;
    result: string;
    correct: string;
  }>();

  const levelNum = parseInt(level || '1');
  const correctCount = parseInt(correct || '0');
  const passed = result === 'pass';
  const perfect = correctCount === 10;

  const [loading, setLoading] = useState(true);
  const [xpEarned, setXpEarned] = useState(0);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const updateProfile = async () => {
      const profile = await getOrCreateUserProfile();
      const today = dayjs().format('YYYY-MM-DD');
      const lastPlayed = profile.last_played ? dayjs(profile.last_played).format('YYYY-MM-DD') : null;

      let newStreak = profile.streak;
      if (!lastPlayed || dayjs(today).diff(dayjs(lastPlayed), 'day') > 1) {
        newStreak = 1; // reset streak
      } else if (lastPlayed !== today) {
        newStreak += 1; // continue streak
      }

      const baseXP = correctCount * 10;
      const levelBonus = levelNum;
      const streakBonus = newStreak >= 5 ? 5 : 0;
      const earned = baseXP + levelBonus + streakBonus;

      const updated = {
        xp: profile.xp + earned,
        streak: newStreak,
        level: passed ? levelNum + 1 : levelNum,
        last_played: dayjs().format('YYYY-MM-DD'),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updated)
        .eq('id', profile.id);

      if (error) console.error('Failed to update profile:', error);

      setXpEarned(earned);
      setProfile({ ...profile, ...updated });
      setLoading(false);
    };

    updateProfile();
  }, []);

  const handleContinue = () => {
    if (!profile) return;
    router.replace({
      pathname: '/flash',
      params: {
        level: profile.level.toString(),
        round: '1',
        correct: '0',
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Updating profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.level}>
        {passed ? `✅ Level ${levelNum} Passed!` : `❌ Level ${levelNum} Failed`}
      </Text>

      <Text style={styles.score}>You got {correctCount} / 10 correct</Text>

      <Text style={styles.xp}>+{xpEarned} XP</Text>
      <Text style={styles.streak}>🔥 Streak: {profile?.streak}</Text>

      {perfect && (
        <Text style={styles.badge}>🏆 PERFECT ROUND</Text>
      )}

      <Button
        title={passed ? 'Next Level →' : 'Retry Level'}
        onPress={handleContinue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  level: { fontSize: 32, fontWeight: 'bold', marginBottom: 10 },
  score: { fontSize: 24, marginBottom: 10 },
  xp: { fontSize: 22, color: '#228B22', marginBottom: 5 },
  streak: { fontSize: 18, marginBottom: 15 },
  badge: {
    fontSize: 20,
    backgroundColor: '#ffeaa7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 20,
  },
});
