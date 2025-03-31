import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useDailyChallenge } from '@lib/daily';
import { useSoundEffects } from '@lib/useSoundEffects';

export default function DailyScreen() {
  const router = useRouter();
  const { playSuccess, playFail } = useSoundEffects();
  const {
    puzzle,
    choices,
    selected,
    correct,
    handleSelect
  } = useDailyChallenge();

  const handleChoice = async (value: number) => {
    const isCorrect = value === puzzle.answer;
    if (isCorrect) {
      await playSuccess();
    } else {
      await playFail();
    }
    handleSelect(value);
  };

  useEffect(() => {
    if (selected !== null) {
      setTimeout(() => {
        router.replace('/result');
      }, 1200);
    }
  }, [selected]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily Challenge</Text>

      <View style={styles.flashBox}>
        <Text style={styles.flashText}>{puzzle.display}</Text>
      </View>

      <View style={styles.choicesContainer}>
        {choices.map((choice) => (
          <TouchableOpacity
            key={choice}
            style={styles.choiceButton}
            onPress={() => handleChoice(choice)}
            disabled={selected !== null}
          >
            <Text style={styles.choiceText}>{choice}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20
  },
  flashBox: {
    padding: 36,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginVertical: 30
  },
  flashText: {
    fontSize: 36,
    fontWeight: 'bold'
  },
  choicesContainer: {
    width: '100%',
    gap: 12
  },
  choiceButton: {
    backgroundColor: '#007aff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  choiceText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600'
  }
});
