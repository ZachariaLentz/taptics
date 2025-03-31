import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Taptics!</Text>
      <Text style={styles.subtitle}>Your daily brain workout starts here.</Text>

      <View style={styles.buttonGroup}>
        <Button title="Start Flash Training" onPress={() => router.push('/flash')} />
        <Button title="Daily Challenge" onPress={() => router.push('/daily')} />
        <Button title="Check Progress" onPress={() => router.push('/progress')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center'
  },
  buttonGroup: {
    gap: 12,
    width: '100%'
  }
});
