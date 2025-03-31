import { useEffect, useState } from 'react';
import { generateFlashSequence, getLevelConfig } from './flashConfig';

export function useFlashRound() {
  const [round, setRound] = useState({ display: '', answer: 0 });
  const [roundNum, setRoundNum] = useState(1);
  const [levelNum, setLevelNum] = useState(1);
  const [correct, setCorrect] = useState(0);
  const [displayValue, setDisplayValue] = useState('');
  const [choices, setChoices] = useState<number[]>([]);
  const [showChoices, setShowChoices] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    startRound();
  }, []);

  const startRound = async () => {
    setLoading(true);
    setShowChoices(false);

    const config = await getLevelConfig(levelNum);
    const flashDelay = (eval(config.flash_delay_formula) as (level: number) => number)(levelNum);
    const sequence = generateFlashSequence(config);

    let displayStr = '';
    for (let i = 0; i < sequence.length; i++) {
      displayStr += `${sequence[i].value > 0 && i > 0 ? '+' : ''}${sequence[i].value}`;
    }

    const answer = sequence.reduce((acc, cur) => {
      switch (cur.op) {
        case '+':
          return acc + cur.value;
        case '-':
          return acc - cur.value;
        case '*':
          return acc * cur.value;
        case '/':
          return acc / cur.value;
        default:
          return acc;
      }
    }, 0);

    setRound({ display: displayStr, answer });
    setDisplayValue(displayStr);
    setChoices(generateChoices(answer));
    setTimeout(() => {
      setShowChoices(true);
      setLoading(false);
    }, flashDelay || 1000);
  };

  const handleSelect = (value: number) => {
    setTimeout(() => {
      if (roundNum < 10) {
        setRoundNum(roundNum + 1);
        startRound();
      }
    }, 700);
  };

  return {
    round,
    roundNum,
    levelNum,
    setLevelNum,
    correct,
    setCorrect,
    showChoices,
    displayValue,
    choices,
    handleSelect,
    loading,
  };
}

function generateChoices(correctAnswer: number): number[] {
  const set = new Set<number>();
  set.add(Number(correctAnswer.toFixed(2)));

  while (set.size < 4) {
    const offset = Math.random() * 10 - 5;
    const candidate = Number((correctAnswer + offset).toFixed(2));
    set.add(candidate);
  }

  return Array.from(set).sort(() => Math.random() - 0.5);
}
