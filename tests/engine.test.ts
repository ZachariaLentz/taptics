import {
  currentStreak,
  dailyPuzzle,
  evaluate,
  generateFlashSequence,
  generatePuzzle,
  initialRoundState,
  localDate,
  mergeCompletions,
  progress,
  submitAnswer,
  xpFor,
  Completion,
} from "../lib/engine";
import { getLevelConfig } from "../lib/flashConfig";
const event = (overrides: Partial<Completion> = {}): Completion => ({
  id: "first",
  kind: "training",
  date: "2026-10-06",
  createdAt: "2026-10-06T12:00:00Z",
  level: 1,
  correct: 7,
  ...overrides,
});
describe("safe progressive arithmetic", () => {
  test("validates levels and introduces operations deliberately", () => {
    for (const level of [0, -1, 1.5, 101, NaN])
      expect(() => getLevelConfig(level)).toThrow();
    expect(getLevelConfig(1)).toMatchObject({
      terms: 2,
      operations: ["+"],
      decimals: false,
    });
    expect(getLevelConfig(3).operations).toEqual(["+", "-"]);
    expect(getLevelConfig(6).operations).toContain("*");
    expect(getLevelConfig(10).operations).toContain("/");
    expect(getLevelConfig(12).decimals).toBe(true);
    for (let level = 2; level <= 100; level++) {
      expect(getLevelConfig(level).terms).toBeGreaterThanOrEqual(
        getLevelConfig(level - 1).terms,
      );
      expect(getLevelConfig(level).maxValue).toBeGreaterThanOrEqual(
        getLevelConfig(level - 1).maxValue,
      );
      expect(getLevelConfig(level).delayMs).toBeLessThanOrEqual(
        getLevelConfig(level - 1).delayMs,
      );
    }
  });
  test("applies multiplication/division to the running total, including negative values", () => {
    expect(
      evaluate([
        { op: "+", value: 5 },
        { op: "-", value: 9 },
        { op: "*", value: 3 },
        { op: "/", value: 2 },
      ]),
    ).toBe(-6);
    expect(
      evaluate([
        { op: "+", value: 0.1 },
        { op: "+", value: 0.2 },
      ]),
    ).toBe(0.3);
    expect(() =>
      evaluate([
        { op: "+", value: 1 },
        { op: "/", value: 0 },
      ]),
    ).toThrow();
    expect(() => evaluate([])).toThrow();
  });
  test("generates repeatable, finite puzzles with four distinct plausible choices across every level", () => {
    const operations = new Set<string>();
    let decimalFound = false;
    for (let level = 1; level <= 100; level++)
      for (let sample = 0; sample < 20; sample++) {
        const puzzle = generatePuzzle(level, `${level}:${sample}`);
        expect(puzzle).toEqual(generatePuzzle(level, `${level}:${sample}`));
        expect(Number.isFinite(puzzle.answer)).toBe(true);
        expect(puzzle.answer).toBe(evaluate(puzzle.terms));
        expect(new Set(puzzle.choices).size).toBe(4);
        expect(puzzle.choices).toContain(puzzle.answer);
        expect(puzzle.terms).toHaveLength(getLevelConfig(level).terms);
        puzzle.terms.slice(1).forEach((term) => {
          expect(getLevelConfig(level).operations).toContain(term.op);
          operations.add(term.op);
          if (!Number.isInteger(term.value)) decimalFound = true;
        });
      }
    expect([...operations].sort()).toEqual(["*", "+", "-", "/"]);
    expect(decimalFound).toBe(true);
    expect(generateFlashSequence(getLevelConfig(1), () => 0)).toEqual([
      { op: "+", value: 1 },
      { op: "+", value: 1 },
    ]);
    expect(
      generatePuzzle(1, "easy").terms.every(
        (term) => term.value > 0 && term.value <= 5,
      ),
    ).toBe(true);
  });
});
test("requires exactly ten answered rounds, counts answer ten and ignores duplicate submissions", () => {
  const puzzle = generatePuzzle(1, "round");
  let state = initialRoundState();
  for (let index = 0; index < 10; index++) {
    expect(state.complete).toBe(false);
    const next = submitAnswer(state, index, puzzle.answer, puzzle);
    expect(submitAnswer(next, index, puzzle.answer, puzzle)).toBe(next);
    state = next;
  }
  expect(state).toMatchObject({ complete: true, correct: 10 });
  expect(state.answers).toHaveLength(10);
  expect(submitAnswer(state, 10, puzzle.answer, puzzle)).toBe(state);
});
test("invalid answers and skipped rounds do not count", () => {
  const state = initialRoundState();
  const puzzle = generatePuzzle(1, "skip");
  expect(submitAnswer(state, 1, puzzle.answer, puzzle)).toBe(state);
  expect(submitAnswer(state, 0, 99999, puzzle)).toBe(state);
});
test("Daily date and user seeding includes stable answer choices", () => {
  expect(dailyPuzzle("alice", "2026-10-06")).toEqual(
    dailyPuzzle("alice", "2026-10-06"),
  );
  expect(dailyPuzzle("alice", "2026-10-06")).not.toEqual(
    dailyPuzzle("alice", "2026-10-07"),
  );
  expect(dailyPuzzle("alice", "2026-10-06")).not.toEqual(
    dailyPuzzle("bob", "2026-10-06"),
  );
  expect(localDate(new Date(2026, 0, 2, 23, 59))).toBe("2026-01-02");
});
test("XP, progression and completion reconciliation do not double award", () => {
  expect(xpFor(event({ correct: 10 }))).toBe(120);
  expect(xpFor(event({ correct: 6 }))).toBe(60);
  expect(xpFor(event({ kind: "daily", correct: 1 }))).toBe(25);
  expect(xpFor(event({ kind: "daily", correct: 0 }))).toBe(5);
  const daily = event({ id: "daily", kind: "daily", correct: 0 });
  const authoritative = { ...daily, id: "remote", correct: 1 };
  const merged = mergeCompletions([event(), daily], [event(), authoritative]);
  expect(merged).toHaveLength(2);
  expect(progress(merged, "2026-10-06")).toMatchObject({
    level: 2,
    xp: 115,
    sessions: 1,
    answered: 10,
    accuracy: 70,
    streak: 1,
    todayDaily: authoritative,
  });
  expect(progress([event({ correct: 6 })], "2026-10-06").level).toBe(1);
  expect(progress([event({ level: 100 })], "2026-10-06").level).toBe(100);
});
test("streaks handle same-day play, gaps, yesterday, future dates, month and year boundaries", () => {
  expect(currentStreak([], "2026-10-06")).toBe(0);
  expect(
    currentStreak(["2026-10-06", "2026-10-06", "2026-10-05"], "2026-10-06"),
  ).toBe(2);
  expect(currentStreak(["2026-10-05", "2026-10-04"], "2026-10-06")).toBe(2);
  expect(currentStreak(["2026-10-04"], "2026-10-06")).toBe(0);
  expect(currentStreak(["2026-10-06", "2026-10-04"], "2026-10-06")).toBe(1);
  expect(
    currentStreak(
      ["2027-01-01", "2026-12-31", "2026-12-30", "2027-01-02"],
      "2027-01-01",
    ),
  ).toBe(3);
});
