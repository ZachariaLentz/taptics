import { Text } from "react-native";
import { usePlayer } from "../lib/PlayerProvider";
import { Card, Screen, styles, SyncStatus, Title } from "../components/ui";
import { xpFor } from "../lib/engine";
export default function ProgressScreen() {
  const { stats, data } = usePlayer();
  const recent = [...data.events].reverse().slice(0, 10);
  return (
    <Screen>
      <Title>Your progress</Title>
      <Text style={styles.muted}>Compete with yesterday’s you.</Text>
      <Card>
        <Text style={styles.number}>Level {stats.level}</Text>
        <Text style={styles.text}>
          {stats.xp} XP • {stats.streak} day streak
        </Text>
        <Text style={styles.muted}>
          Today’s Daily:{" "}
          {stats.todayDaily
            ? stats.todayDaily.correct
              ? "Correct ✓"
              : "Completed • incorrect"
            : "Ready to play"}
        </Text>
      </Card>
      <Card>
        <Text style={styles.heading}>Training stats</Text>
        <Text style={styles.text}>{stats.sessions} completed workouts</Text>
        <Text style={styles.text}>{stats.answered} problems answered</Text>
        <Text style={styles.text}>
          {stats.accuracy === null
            ? "Accuracy appears after your first workout."
            : `${stats.accuracy}% overall accuracy`}
        </Text>
      </Card>
      <Text style={styles.heading}>Recent activity</Text>
      {!recent.length && (
        <Card>
          <Text style={styles.text}>
            Your first workout starts your story. Head Home to train.
          </Text>
        </Card>
      )}
      {recent.map((event) => (
        <Card key={event.id}>
          <Text style={styles.heading}>
            {event.kind === "daily"
              ? "Daily Challenge"
              : `Flash • level ${event.level}`}
          </Text>
          <Text style={styles.muted}>
            {event.date} •{" "}
            {event.kind === "daily"
              ? event.correct
                ? "Correct"
                : "Incorrect"
              : `${event.correct}/10 correct`}{" "}
            • +{xpFor(event)} XP
          </Text>
        </Card>
      ))}
      <SyncStatus />
    </Screen>
  );
}
