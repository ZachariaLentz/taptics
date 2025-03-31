import React, { useEffect } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSoundEffects } from '@lib/useSoundEffects';

export default function ResultScreen() {
  const { result, correct, level } = useLocalSearchParams();
  const router = useRouter();
  const { playSuccess, playFail } = useSoundEffects();

  const passed = result === 'pass';

  useEffect(() => {
    if (passed) {
      playSuccess();
    } else {
      playFail();
    }
  }, [passed]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{passed ? '✅ You Passed!' : '❌ Try Again'}</Text>
      <Text style={styles.text}>Correct Answers: {correct}</Text>
      <Text style={styles.text}>Level: {level}</Text>

      <Button title="Back to Home" onPress={() => router.replace('/home')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  text: {
    fontSize: 18,
    marginBottom: 10,
  },
});