import seedrandom from "seedrandom";
import {
  FlashConfig,
  getLevelConfig,
  MAX_LEVEL,
  Operation,
} from "./flashConfig";
export const ROUND_COUNT = 10;
export const PASS_SCORE = 7;
export interface Term {
  op: Operation;
  value: number;
}
export interface Puzzle {
  terms: Term[];
  answer: number;
  choices: number[];
}
export interface Completion {
  id: string;
  kind: "training" | "daily";
  date: string;
  createdAt: string;
  level: number;
  correct: number;
  selected?: number;
  puzzle?: Puzzle;
}
export const rounded = (value: number) => Math.round(value * 100) / 100;
// Flash is an accumulator: start with the first number, then apply each operation in order.
export function evaluate(terms: Term[]): number {
  if (!terms.length) throw new Error("An empty sequence has no answer.");
  return terms.slice(1).reduce((total, term) => {
    if (term.op === "/" && term.value === 0)
      throw new Error("Division by zero.");
    const value =
      term.op === "+"
        ? total + term.value
        : term.op === "-"
          ? total - term.value
          : term.op === "*"
            ? total * term.value
            : total / term.value;
    if (!Number.isFinite(value)) throw new Error("Invalid arithmetic.");
    return rounded(value);
  }, terms[0].value);
}
export function generateFlashSequence(
  config: FlashConfig,
  random: () => number,
): Term[] {
  const int = (min: number, max: number) =>
    min + Math.floor(random() * (max - min + 1));
  const number = () =>
    config.decimals
      ? int(1, config.maxValue * 10) / 10
      : int(1, config.maxValue);
  const terms: Term[] = [{ op: "+", value: number() }];
  for (let i = 1; i < config.terms; i++) {
    const op = config.operations[int(0, config.operations.length - 1)];
    const total = evaluate(terms);
    // Exact division at early levels; bounded multiplication prevents runaway answers.
    let value = op === "*" ? int(2, 4) : number();
    if (op === "/") {
      const divisors = [2, 3, 4, 5].filter((d) => Number.isInteger(total / d));
      value = divisors.length ? divisors[int(0, divisors.length - 1)] : 1;
    }
    terms.push({ op, value });
  }
  return terms;
}
export function generatePuzzle(level: number, seed: string): Puzzle {
  const random = seedrandom(seed);
  const config = getLevelConfig(level);
  const terms = generateFlashSequence(config, random);
  const answer = evaluate(terms);
  const choices = new Set([answer]);
  const step = config.decimals ? 0.5 : 1;
  const direction = random() < 0.5 ? -1 : 1;
  for (const offset of [1, -1, 2])
    choices.add(rounded(answer + offset * direction * step));
  const options = [...choices];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { terms, answer, choices: options };
}
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function dailyPuzzle(userId: string, date: string): Puzzle {
  return generatePuzzle(4, `taptics-daily-v1:${userId}:${date}`);
}
export const termLabel = (term: Term, index: number) =>
  index === 0
    ? String(term.value)
    : `${term.op === "*" ? "×" : term.op === "/" ? "÷" : term.op} ${term.value}`;
export const puzzleLabel = (puzzle: Puzzle) =>
  puzzle.terms.map(termLabel).join("  ");
export interface RoundState {
  answers: number[];
  correct: number;
  complete: boolean;
}
export const initialRoundState = (): RoundState => ({
  answers: [],
  correct: 0,
  complete: false,
});
export function submitAnswer(
  state: RoundState,
  index: number,
  selected: number,
  puzzle: Puzzle,
): RoundState {
  if (
    state.complete ||
    index !== state.answers.length ||
    !puzzle.choices.includes(selected)
  )
    return state;
  const answers = [...state.answers, selected];
  return {
    answers,
    correct: state.correct + Number(selected === puzzle.answer),
    complete: answers.length === ROUND_COUNT,
  };
}
export function xpFor(event: Completion): number {
  return event.kind === "daily"
    ? event.correct
      ? 25
      : 5
    : event.correct * 10 + (event.correct >= PASS_SCORE ? 20 : 0);
}
const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86400000;
export function currentStreak(dates: string[], today: string): number {
  const days = [...new Set(dates.map(dayNumber))]
    .filter((n) => n <= dayNumber(today))
    .sort((a, b) => b - a);
  if (!days.length || dayNumber(today) - days[0] > 1) return 0;
  let streak = 1;
  for (let i = 1; i < days.length && days[i - 1] - days[i] === 1; i++) streak++;
  return streak;
}
export function mergeCompletions(
  local: Completion[],
  remote: Completion[],
): Completion[] {
  const events = new Map<string, Completion>();
  for (const event of [...local, ...remote])
    events.set(
      event.kind === "daily" ? `daily:${event.date}` : event.id,
      event,
    );
  return [...events.values()].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
}
export function progress(events: Completion[], today: string) {
  const sessions = events.filter((e) => e.kind === "training");
  const answered = sessions.length * ROUND_COUNT;
  return {
    level: Math.min(
      MAX_LEVEL,
      Math.max(
        1,
        ...sessions
          .filter((e) => e.correct >= PASS_SCORE)
          .map((e) => e.level + 1),
      ),
    ),
    xp: events.reduce((sum, e) => sum + xpFor(e), 0),
    streak: currentStreak(
      events.map((e) => e.date),
      today,
    ),
    sessions: sessions.length,
    answered,
    accuracy: answered
      ? Math.round(
          (sessions.reduce((sum, e) => sum + e.correct, 0) / answered) * 100,
        )
      : null,
    todayDaily: events.find((e) => e.kind === "daily" && e.date === today),
  };
}
