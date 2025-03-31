import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFlashRound } from '@lib/flash';
import { useSoundEffects } from '@lib/useSoundEffects';

export default function FlashScreen() {
  const router = useRouter();
  const { playSuccess, playFail } = useSoundEffects();
  const {
    round,
    roundNum,
    levelNum,
    showChoices,
    correct,
    setCorrect,
    loading,
    displayValue,
    choices,
    handleSelect
  } = useFlashRound();

  const handleAnswer = (choice: number) => {
    const isCorrect = choice === round.answer;
    if (isCorrect) {
      playSuccess();
      setCorrect(correct + 1);
    } else {
      playFail();
    }
    handleSelect(choice);
  };

  useEffect(() => {
    if (!loading && roundNum >= 10) {
      setTimeout(() => {
        router.replace({
          pathname: '/score',
          params: {
            level: levelNum.toString(),
            result: correct >= 7 ? 'pass' : 'fail',
            correct: correct.toString(),
          },
        });
      }, 800);
    }
  }, [loading, roundNum]);

  return (
    <View style={styles.container}>
      <Text style={styles.level}>Level {levelNum}</Text>
      <View style={styles.flashBox}>
        <Text style={styles.flashText}>{displayValue}</Text>
      </View>

      {showChoices && (
        <View style={styles.choicesContainer}>
          {choices.map((choice) => (
            <TouchableOpacity
              key={choice}
              style={styles.choiceButton}
              onPress={() => handleAnswer(choice)}
            >
              <Text style={styles.choiceText}>{choice}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
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
  level: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 10
  },
  flashBox: {
    padding: 40,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginVertical: 30
  },
  flashText: {
    fontSize: 40,
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
