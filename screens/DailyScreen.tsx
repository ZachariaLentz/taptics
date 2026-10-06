import { useMemo, useRef, useState } from "react";
import { Text } from "react-native";
import * as Crypto from "expo-crypto";
import {
  Button,
  Card,
  Feedback,
  Screen,
  styles,
  SyncStatus,
  Title,
} from "../components/ui";
import { usePlayer } from "../lib/PlayerProvider";
import {
  Completion,
  dailyPuzzle,
  localDate,
  puzzleLabel,
  xpFor,
} from "../lib/engine";
import { useSoundEffects } from "../lib/useSoundEffects";
export default function DailyScreen() {
  const { id, today } = usePlayer();
  return <DailyAttempt key={`${id}:${today}`} />;
}
function DailyAttempt() {
  const { id, today, stats, save } = usePlayer();
  const puzzle = useMemo(() => dailyPuzzle(id, today), [id, today]);
  const attempt = useRef<Completion | null>(null);
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sound = useSoundEffects();
  const completed = stats.todayDaily;
  const submit = async (value: number) => {
    if (completed || locked.current) return;
    if (localDate() !== today) {
      setError(
        "A new day has started. Today’s challenge will refresh shortly.",
      );
      return;
    }
    locked.current = true;
    setBusy(true);
    setError("");
    if (!attempt.current)
      attempt.current = {
        id: Crypto.randomUUID(),
        kind: "daily",
        date: today,
        createdAt: new Date().toISOString(),
        level: 4,
        correct: Number(value === puzzle.answer),
        selected: value,
        puzzle,
      };
    try {
      await save(attempt.current);
      sound.feedback(Boolean(attempt.current.correct));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save your answer. Retry below.",
      );
      locked.current = false;
    } finally {
      setBusy(false);
    }
  };
  const shown = completed?.puzzle ?? puzzle;
  return (
    <Screen>
      <Text style={styles.muted}>{today} • ONE CHANCE EACH DAY</Text>
      <Title>Daily Challenge 🔥</Title>
      <Text style={styles.text}>
        Keep a running total from left to right. A completed attempt counts
        toward your streak.
      </Text>
      <Card>
        <Text style={styles.number}>{puzzleLabel(shown)}</Text>
      </Card>
      {completed ? (
        <Card>
          <Feedback correct={Boolean(completed.correct)}>
            {completed.correct
              ? "Correct! Today’s challenge is complete."
              : `Challenge complete. The correct total was ${shown.answer}.`}
          </Feedback>
          <Text style={styles.text}>
            Your answer: {completed.selected ?? "Recorded"} • +
            {xpFor(completed)} XP
          </Text>
          <Text style={styles.muted}>
            Come back tomorrow for a fresh puzzle. Train in Flash to keep
            improving today.
          </Text>
        </Card>
      ) : (
        <>
          {puzzle.choices.map((value) => (
            <Button
              key={value}
              title={String(value)}
              disabled={busy || attempt.current !== null}
              onPress={() => {
                void submit(value);
              }}
            />
          ))}
          {busy && (
            <Text accessibilityLiveRegion="polite" style={styles.muted}>
              Saving your answer…
            </Text>
          )}
          {error && (
            <>
              <Feedback>{error}</Feedback>
              {attempt.current && (
                <Button
                  title="Retry saving this answer"
                  onPress={() => {
                    void submit(attempt.current!.selected!);
                  }}
                />
              )}
            </>
          )}
        </>
      )}
      <SyncStatus />
    </Screen>
  );
}
