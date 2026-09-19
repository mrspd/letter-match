import { Color } from "pixi.js";

const SATURATION = 68;
const LIGHTNESS = 55;

/**
 * Deterministically assigns each word a distinct, evenly-spaced hue so the
 * same word always gets the same color wherever it's rendered (board cells,
 * word list), as long as callers pass the same word list in the same order.
 */
export function createWordColorMap(words: string[]): Map<string, number> {
  const colors = new Map<string, number>();
  const count = words.length;
  words.forEach((word, i) => {
    const hue = Math.round((360 * i) / count);
    const color = new Color({ h: hue, s: SATURATION, l: LIGHTNESS }).toNumber();
    colors.set(word.toUpperCase(), color);
  });
  return colors;
}
