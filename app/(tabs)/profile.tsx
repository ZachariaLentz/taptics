import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@lib/supabase';
import { getOrCreateUserProfile } from '@lib/user';

export default function ProfileScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    id: string;
    level: number;
    xp: number;
    streak: number;
    last_played: string | null;
  } | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!sessionData?.session) {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) throw error;
        }

        const userProfile = await getOrCreateUserProfile();
        setProfile(userProfile);
      } catch (err: any) {
        console.error('Profile load error:', err.message || err);
        Alert.alert('Error', err.message || 'Unable to load profile.');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const handleStart = () => {
    if (!profile) return;
    router.push({
      pathname: '/flash',
      params: {
        level: profile.level.toString(),
        round: '1',
        correct: '0',
      },
    });
  };

  const handleDaily = () => {
    router.push('/daily');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.level}>Level {profile?.level}</Text>
      <Text style={styles.progress}>XP: {profile?.xp} | 🔥 Streak: {profile?.streak}</Text>
      <Button title="Start Practice" onPress={handleStart} />
      <View style={{ marginVertical: 10 }} />
      <Button title="🗓️ Daily Challenge" onPress={handleDaily} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  level: { fontSize: 32, fontWeight: 'bold', marginBottom: 10 },
  progress: { fontSize: 18, marginBottom: 30 },
});
