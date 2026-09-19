/** A half-open index range `[start, end)` within a line that matches a word. */
export interface MatchRange {
  start: number;
  end: number;
  /** The word (from the level's word list) that this range matched. */
  word: string;
}

/**
 * Finds every position in `letters` where a word from `words` (forward or
 * reversed) appears as a contiguous, exact-length match. Ranges that overlap
 * any index present in `lockedIndices` are skipped entirely, so already
 * matched cells never take part in forming new matches.
 */
export function findMatches(
  letters: string[],
  words: string[],
  lockedIndices: ReadonlySet<number>,
): MatchRange[] {
  const line = letters.join("");
  const matches: MatchRange[] = [];

  for (const word of words) {
    const wordLength = word.length;
    if (wordLength === 0 || wordLength > line.length) continue;
    const reversedWord = [...word].reverse().join("");

    for (let start = 0; start + wordLength <= line.length; start++) {
      const end = start + wordLength;

      let overlapsLocked = false;
      for (let i = start; i < end; i++) {
        if (lockedIndices.has(i)) {
          overlapsLocked = true;
          break;
        }
      }
      if (overlapsLocked) continue;

      const segment = line.slice(start, end);
      if (segment === word || segment === reversedWord) {
        matches.push({ start, end, word });
      }
    }
  }

  return matches;
}
