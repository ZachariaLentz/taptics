import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';

export default function SoundTestScreen() {
  const playSuccess = async () => {
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/sfx/success.mp3')
    );
    await sound.playAsync();
  };

  const playFail = async () => {
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/sfx/fail.mp3')
    );
    await sound.playAsync();
  };

  return (
    <View style={styles.container}>
      <Text>🔊 Sound Test</Text>
      <Button title="Play Success" onPress={playSuccess} />
      <Button title="Play Fail" onPress={playFail} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
