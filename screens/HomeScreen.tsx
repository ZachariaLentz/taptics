import { GuestImportCard } from "../components/GuestImportCard";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { usePlayer } from "../lib/PlayerProvider";
import {
  Button,
  Card,
  Screen,
  styles,
  SyncStatus,
  Title,
} from "../components/ui";
export default function HomeScreen() {
  const router = useRouter();
  const { stats, user } = usePlayer();
  return (
    <Screen>
      <Text style={styles.muted}>TAPTICS • YOUR DAILY BRAIN WORKOUT</Text>
      <Title>{"Small sessions.\nSharper thinking."}</Title>
      <Text style={styles.text}>
        Ten problems. One step forward. Ready to beat your last workout?
      </Text>
      <Card>
        <View style={styles.row}>
          <Text style={styles.heading}>Level {stats.level}</Text>
          <Text style={styles.heading}>{stats.xp} XP</Text>
        </View>
        <Text style={styles.text}>{stats.streak} day streak 🔥</Text>
        <Text style={styles.muted}>
          {user ? "Account progress" : "Guest progress • saved on this device"}
        </Text>
      </Card>
      <Card>
        <Text style={styles.heading}>⚡ Flash Training</Text>
        <Text style={styles.muted}>
          Watch each term. Keep a running total. Score 7/10 to level up.
        </Text>
        <Button
          title={`Train at level ${stats.level}`}
          onPress={() => router.push("/flash")}
        />
      </Card>
      <Card>
        <Text style={styles.heading}>🔥 Daily Challenge</Text>
        <Text style={styles.muted}>
          {stats.todayDaily
            ? `Completed today • ${stats.todayDaily.correct ? "correct answer" : "keep practicing"}`
            : "One puzzle. One chance. A fresh challenge every day."}
        </Text>
        <Button
          secondary
          title={
            stats.todayDaily ? "See today’s result" : "Try today’s challenge"
          }
          onPress={() => router.push("/daily")}
        />
      </Card>
      <GuestImportCard key={user?.id ?? "guest"} />
      <SyncStatus />
    </Screen>
  );
}
