type Operation = '+' | '-' | '*' | '/';

export interface FlashConfig {
  num_terms_min: number;
  num_terms_max: number;
  op_breakpoints: { level: number; ops: Operation[] }[];
  value_range_formula: string;
  flash_delay_formula: string;
  allow_decimals_level: number;
}

export function getLevelConfig(level: number): FlashConfig {
  return {
    num_terms_min: Math.min(2 + Math.floor(level / 5), 6),
    num_terms_max: Math.min(3 + Math.floor(level / 3), 8),
    op_breakpoints: [
      { level: 1, ops: ['+'] },
      { level: 3, ops: ['+', '-'] },
      { level: 6, ops: ['+', '-', '*'] },
      { level: 10, ops: ['+', '-', '*', '/'] },
    ],
    value_range_formula: '(level) => 5 + level * 2',
    flash_delay_formula: '(level) => Math.max(600 - level * 30, 200)',
    allow_decimals_level: 12,
  };
}

export function generateFlashSequence(config: FlashConfig) {
  const level = 1; // You could pass in level if needed for formulas
  const numTerms = getRandomInt(config.num_terms_min, config.num_terms_max);
  const ops = getAllowedOperations(config.op_breakpoints, level);
  const rangeFn = eval(config.value_range_formula) as (level: number) => number;
  const maxVal = rangeFn(level);

  const sequence = [];
  for (let i = 0; i < numTerms; i++) {
    const value = getRandomInt(-maxVal, maxVal);
    const op: Operation = ops[Math.floor(Math.random() * ops.length)];
    sequence.push({ value, op });
  }
  return sequence;
}

function getAllowedOperations(breakpoints: FlashConfig['op_breakpoints'], level: number): Operation[] {
  let allowed: Operation[] = ['+'];
  for (const bp of breakpoints) {
    if (level >= bp.level) allowed = bp.ops;
  }
  return allowed;
}

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
