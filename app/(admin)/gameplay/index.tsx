import { View, Text, StyleSheet, Button } from 'react-native';
import { useRouter } from 'expo-router';

export default function GameplayIndex() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gameplay Screens</Text>

      <Button title="Flash Trainer" onPress={() => router.push('/(admin)/gameplay/flash')} />
      <Button title="Daily Challenge" onPress={() => router.push('/(admin)/gameplay/daily')} />
      <Button title="Progress View" onPress={() => router.push('/(admin)/gameplay/progress')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center'
  }
});
