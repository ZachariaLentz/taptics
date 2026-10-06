import { useEffect, useRef, useState } from "react";
import { AppState, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Crypto from "expo-crypto";
import {
  Button,
  Card,
  Feedback,
  Screen,
  styles,
  Title,
} from "../components/ui";
import {
  Completion,
  generatePuzzle,
  initialRoundState,
  localDate,
  PASS_SCORE,
  ROUND_COUNT,
  submitAnswer,
  termLabel,
} from "../lib/engine";
import { getLevelConfig } from "../lib/flashConfig";
import { usePlayer } from "../lib/PlayerProvider";
import { useSoundEffects } from "../lib/useSoundEffects";
export default function FlashScreen() {
  const router = useRouter();
  const { stats, id: playerId, save } = usePlayer();
  const [session] = useState(() => ({
    id: Crypto.randomUUID(),
    level: stats.level,
    playerId,
  }));
  const [state, setState] = useState(initialRoundState);
  const stateRef = useRef(state);
  const [phase, setPhase] = useState<
    "ready" | "flashing" | "choices" | "feedback" | "saving"
  >("ready");
  const [index, setIndex] = useState(0);
  const [term, setTerm] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const advancing = useRef(false);
  const sounds = useSoundEffects();
  const feedbackRef = useRef(sounds);
  feedbackRef.current = sounds;
  const [puzzles] = useState(() =>
    Array.from({ length: ROUND_COUNT }, (_, i) =>
      generatePuzzle(session.level, `${session.id}:${i}`),
    ),
  );
  const puzzle = puzzles[index];
  const config = getLevelConfig(session.level);
  useEffect(() => {
    if (phase !== "flashing") return;
    feedbackRef.current.flash();
    const timer = setTimeout(() => {
      if (term < puzzle.terms.length - 1) setTerm((value) => value + 1);
      else setPhase("choices");
    }, config.delayMs);
    return () => clearTimeout(timer);
  }, [phase, term, puzzle, config.delayMs]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (status) => {
      if (status !== "active")
        setPhase((value) =>
          value === "flashing" || value === "choices" ? "ready" : value,
        );
    });
    return () => listener.remove();
  }, []);
  const start = () => {
    setTerm(0);
    locked.current = false;
    setSelected(null);
    setPhase("flashing");
  };
  const answer = (value: number) => {
    if (phase !== "choices" || locked.current) return;
    locked.current = true;
    const next = submitAnswer(stateRef.current, index, value, puzzle);
    stateRef.current = next;
    setState(next);
    setSelected(value);
    setPhase("feedback");
    advancing.current = false;
    feedbackRef.current.feedback(value === puzzle.answer);
  };
  const finish = async () => {
    if (advancing.current) return;
    advancing.current = true;
    setPhase("saving");
    setError("");
    const event: Completion = {
      id: session.id,
      kind: "training",
      level: session.level,
      correct: stateRef.current.correct,
      date: localDate(),
      createdAt: new Date().toISOString(),
    };
    try {
      await save(event);
      router.replace({ pathname: "/score", params: { id: session.id } });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save your workout. Retry below.",
      );
      setPhase("feedback");
      advancing.current = false;
    }
  };
  if (session.playerId !== playerId)
    return (
      <Screen>
        <Title>Account changed</Title>
        <Text style={styles.text}>
          Start a new workout with your current profile.
        </Text>
        <Button title="Return Home" onPress={() => router.replace("/home")} />
      </Screen>
    );
  return (
    <Screen>
      <Text style={styles.muted}>
        LEVEL {session.level} • ROUND {index + 1} OF {ROUND_COUNT}
      </Text>
      <Title>Keep the total.</Title>
      <Text style={styles.muted}>
        Start with the first number, then apply each term in order. No operator
        precedence.
      </Text>
      <View
        accessible
        accessibilityLabel={`Workout progress: ${state.answers.length} of ten answered`}
        style={{ height: 8, borderRadius: 4, backgroundColor: "#D5DBED" }}
      >
        <View
          style={{
            height: 8,
            borderRadius: 4,
            backgroundColor: "#4C39C9",
            width: `${state.answers.length * 10}%`,
          }}
        />
      </View>
      <Card>
        {phase === "ready" ? (
          <>
            <Text style={styles.heading}>
              {index === 0
                ? "Ready for your workout?"
                : "Ready for the next round?"}
            </Text>
            <Text style={styles.muted}>
              {puzzle.terms.length} terms • {(config.delayMs / 1000).toFixed(2)}{" "}
              seconds per term. 7 correct answers unlock the next level.
            </Text>
            <Button title="Flash the terms" onPress={start} />
          </>
        ) : (
          <Text
            accessibilityLiveRegion="polite"
            style={[
              styles.number,
              { textAlign: "center", paddingVertical: 30 },
            ]}
          >
            {phase === "flashing"
              ? termLabel(puzzle.terms[term], term)
              : "What’s the total?"}
          </Text>
        )}
      </Card>
      {(phase === "choices" || phase === "feedback" || phase === "saving") &&
        puzzle.choices.map((choice) => (
          <Button
            key={choice}
            title={`${choice}${selected === choice ? " • your answer" : ""}`}
            secondary
            disabled={phase !== "choices"}
            onPress={() => answer(choice)}
          />
        ))}
      {(phase === "feedback" || phase === "saving") && (
        <Card>
          <Feedback correct={selected === puzzle.answer}>
            {selected === puzzle.answer
              ? "Correct! Nice work."
              : `Not quite. The total was ${puzzle.answer}.`}
          </Feedback>
          <Text style={styles.text}>{state.correct} correct so far</Text>
          {error && <Feedback>{error}</Feedback>}
          <Button
            disabled={phase === "saving"}
            title={
              phase === "saving"
                ? "Saving workout…"
                : state.complete
                  ? error
                    ? "Retry saving result"
                    : `See result • ${state.correct >= PASS_SCORE ? "level passed!" : "keep practicing"}`
                  : "Next round"
            }
            onPress={() => {
              if (state.complete) void finish();
              else {
                if (advancing.current) return;
                advancing.current = true;
                setIndex((value) => value + 1);
                setTerm(0);
                setSelected(null);
                setPhase("ready");
              }
            }}
          />
        </Card>
      )}
    </Screen>
  );
}
