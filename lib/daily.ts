import { useEffect, useState } from 'react';
import { supabase } from '@lib/supabase';
import dayjs from 'dayjs';

export function useDailyChallenge() {
  const [puzzle, setPuzzle] = useState({ display: '', answer: 0 });
  const [choices, setChoices] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    const today = dayjs().format('YYYY-MM-DD');
    const seed = parseInt(dayjs().format('YYYYMMDD'));
    const { display, answer } = generatePuzzle(seed);
    setPuzzle({ display, answer });
    setChoices(generateChoices(answer));
  }, []);

  const handleSelect = async (value: number) => {
    setSelected(value);
    const wasCorrect = value === puzzle.answer;
    setCorrect(wasCorrect);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ daily_correct: wasCorrect ? 1 : 0, last_daily: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating daily result:', error);
    }
  };

  return {
    puzzle,
    choices,
    selected,
    correct,
    handleSelect,
  };
}

function generatePuzzle(seed: number) {
  const rand = seededRandom(seed);
  const a = Math.floor(rand() * 10 + 1);
  const b = Math.floor(rand() * 10 + 1);
  const display = `${a} + ${b}`;
  const answer = a + b;
  return { display, answer };
}

function generateChoices(correctAnswer: number): number[] {
  const set = new Set<number>();
  set.add(correctAnswer);
  while (set.size < 4) {
    const offset = Math.floor(Math.random() * 5 + 1);
    set.add(correctAnswer + (Math.random() > 0.5 ? offset : -offset));
  }
  return Array.from(set).sort(() => Math.random() - 0.5);
}

function seededRandom(seed: number) {
  let value = seed;
  return function () {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}
