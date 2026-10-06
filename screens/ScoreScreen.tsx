import { Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Button,
  Card,
  Screen,
  styles,
  SyncStatus,
  Title,
} from "../components/ui";
import { usePlayer } from "../lib/PlayerProvider";
import { PASS_SCORE, xpFor } from "../lib/engine";
import { MAX_LEVEL } from "../lib/flashConfig";
export default function ScoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, stats } = usePlayer();
  const event = data.events.find((e) => e.id === id && e.kind === "training");
  if (!event)
    return (
      <Screen>
        <Title>No workout result</Title>
        <Text style={styles.text}>Complete a workout to see your score.</Text>
        <Button title="Return Home" onPress={() => router.replace("/home")} />
      </Screen>
    );
  const passed = event.correct >= PASS_SCORE;
  return (
    <Screen>
      <Title>{passed ? "Level cleared! ⚡" : "Every rep counts."}</Title>
      <Card>
        <Text style={styles.number}>{event.correct} / 10</Text>
        <Text style={styles.text}>
          Level {event.level} • +{xpFor(event)} XP
        </Text>
        <Text style={styles.muted}>
          {event.correct === 10 ? "Perfect workout! " : ""}
          {passed
            ? event.level === MAX_LEVEL
              ? "Top level reached. Keep sharpening your skills."
              : `Your current level is ${stats.level}.`
            : "Score at least 7/10 to advance. You can retry now."}
        </Text>
      </Card>
      <Text style={styles.text}>{stats.streak} day streak 🔥</Text>
      <Button
        title={passed ? "Train again" : "Retry training"}
        onPress={() => router.replace("/flash")}
      />
      <Button
        title="Back to Home"
        secondary
        onPress={() => router.replace("/home")}
      />
      <SyncStatus />
    </Screen>
  );
}
