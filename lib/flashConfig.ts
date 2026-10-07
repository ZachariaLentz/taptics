export type Operation = "+" | "-" | "*" | "/";
export interface FlashConfig {
  level: number;
  terms: number;
  maxValue: number;
  delayMs: number;
  operations: Operation[];
  decimals: boolean;
}
export const MAX_LEVEL = 100;
export function getLevelConfig(level: number): FlashConfig {
  if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL)
    throw new Error("Level must be between 1 and 100.");
  return {
    level,
    terms: Math.min(2 + Math.floor((level - 1) / 4), 6),
    maxValue: Math.min(5 + (level - 1) * 2, 99),
    delayMs: Math.max(1400 - (level - 1) * 40, 550),
    operations:
      level >= 10
        ? ["+", "-", "*", "/"]
        : level >= 6
          ? ["+", "-", "*"]
          : level >= 3
            ? ["+", "-"]
            : ["+"],
    decimals: level >= 12,
  };
}
