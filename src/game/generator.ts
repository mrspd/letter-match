import { findMatches } from "./matcher";
import type { LevelConfig } from "./types";

export const MIN_BOARD_SIZE = 5;
export const MAX_BOARD_SIZE = 10;

/** Average number of scramble moves applied per row/column when building a level. */
const SCRAMBLE_MOVES_PER_LINE = 3;
/** Safety margin added on top of the scramble depth to get the player's move budget. */
const MOVE_LIMIT_BUFFER = 0.3;

export interface GeneratedBoard {
  /** The scrambled starting grid, `size x size` letters. */
  grid: string[][];
  /**
   * Player's move budget: the number of scramble moves used to shuffle the
   * solved board (a guaranteed-achievable "undo in this many moves" bound,
   * used as our practical stand-in for the true minimum - computing the
   * exact optimal solve length is intractable for row/column rotation
   * puzzles at these sizes), plus a 30% safety margin, rounded up.
   */
  moveLimit: number;
}

/** Throws if the level configuration is inconsistent with the one-word-per-row model. */
export function validateLevel(level: LevelConfig): void {
  if (level.size < MIN_BOARD_SIZE || level.size > MAX_BOARD_SIZE) {
    throw new Error(
      `Board size must be between ${MIN_BOARD_SIZE} and ${MAX_BOARD_SIZE}, got ${level.size}`,
    );
  }
  if (level.words.length !== level.size) {
    throw new Error(
      `Level must have exactly ${level.size} words (one per row), got ${level.words.length}`,
    );
  }
  for (const word of level.words) {
    const length = [...word].length;
    if (length !== level.size) {
      throw new Error(
        `Word "${word}" has length ${length}, expected exactly ${level.size}`,
      );
    }
  }
}

function randomInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}

/** Cyclically shifts `grid[row]`; `steps > 0` moves letters toward higher column indices. */
function shiftRow(grid: string[][], row: number, steps: number): void {
  const size = grid.length;
  const old = grid[row];
  const next: string[] = new Array(size);
  for (let col = 0; col < size; col++) {
    const newCol = (((col + steps) % size) + size) % size;
    next[newCol] = old[col];
  }
  grid[row] = next;
}

/** Cyclically shifts column `col`; `steps > 0` moves letters toward higher row indices. */
function shiftCol(grid: string[][], col: number, steps: number): void {
  const size = grid.length;
  const old = grid.map((row) => row[col]);
  for (let row = 0; row < size; row++) {
    const newRow = (((row + steps) % size) + size) % size;
    grid[newRow][col] = old[row];
  }
}

/** Builds the solved reference grid: row `i` is exactly `words[i]`. */
function buildSolvedGrid(level: LevelConfig): string[][] {
  return level.words.map((word) => [...word.toUpperCase()]);
}

/** True if any row or column already reads as one of the level's words. */
function hasAnyLineMatch(grid: string[][], words: string[]): boolean {
  const size = grid.length;
  const empty = new Set<number>();

  for (let row = 0; row < size; row++) {
    if (findMatches(grid[row], words, empty).length > 0) return true;
  }
  for (let col = 0; col < size; col++) {
    const colLetters = grid.map((row) => row[col]);
    if (findMatches(colLetters, words, empty).length > 0) return true;
  }
  return false;
}

/**
 * Builds a level's starting board by scrambling the solved layout (one word
 * per row) with random row/column rotations - the same move type the player
 * performs. This guarantees the board is always solvable (undo the scramble)
 * and gives us a natural, cheap-to-compute move budget, unlike searching for
 * a true optimal solution which is intractable at these grid sizes.
 */
export function generateBoard(
  level: LevelConfig,
  maxAttempts = 200,
): GeneratedBoard {
  validateLevel(level);

  const words = level.words.map((word) => word.toUpperCase());
  const scrambleMoves = level.size * SCRAMBLE_MOVES_PER_LINE;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid = buildSolvedGrid(level);

    for (let move = 0; move < scrambleMoves; move++) {
      const axis = Math.random() < 0.5 ? "row" : "col";
      const index = randomInt(level.size);
      const steps = 1 + randomInt(level.size - 1); // never 0, always an actual move

      if (axis === "row") shiftRow(grid, index, steps);
      else shiftCol(grid, index, steps);
    }

    if (!hasAnyLineMatch(grid, words)) {
      return {
        grid,
        moveLimit: Math.ceil(scrambleMoves * (1 + MOVE_LIMIT_BUFFER)),
      };
    }
  }

  throw new Error(
    "Could not scramble a board without accidental word matches after max attempts",
  );
}
