import { Container, FederatedPointerEvent, Graphics, Ticker } from "pixi.js";
import { GameCell } from "./GameCell";
import { generateBoard } from "./generator";
import { findMatches } from "./matcher";
import type { LevelConfig } from "./types";
import { createWordColorMap } from "./wordColors";

const SWIPE_AXIS_THRESHOLD = 8; // px of movement before we lock in a drag direction
const SNAP_DURATION_MS = 150;

const ARROW_COLOR = 0x7f8fa6;
const ARROW_HOVER_COLOR = 0xecf0f1;

type DragAxis = "row" | "col";
type ArrowDirection = -1 | 1;
type ArrowSide = "left" | "right" | "up" | "down";

export interface GameBoardEvents {
  /**
   * Called whenever the set of fully-solved words changes (including the
   * initial empty state isn't reported, only actual changes after a swipe).
   */
  onSolvedWordsChanged?: (solvedWords: ReadonlySet<string>) => void;
  /** Called after every move that actually costs at least one move. */
  onMoveMade?: (movesUsed: number, moveLimit: number) => void;
  /**
   * Called continuously while dragging with the number of moves the current
   * gesture would cost if released right now (`null` once there is nothing
   * to preview, e.g. drag just started or ended).
   */
  onMovePreview?: (cost: number | null) => void;
}

/**
 * Renders a letter grid and handles row/column swipe gestures: dragging a
 * cell horizontally shifts its whole row, dragging vertically shifts its
 * whole column (cyclically, with wrap-around). Small arrow buttons around
 * the edges offer the same shifts via a single click. After every shift,
 * rows and columns are re-checked against the level's word list; matched
 * cells are recolored and excluded from future matching.
 *
 * Move cost: a shift's cost is the *circular distance* it moves letters by
 * (e.g. shifting 1 step costs 1, shifting `size - 1` steps also costs 1
 * since it's equivalent to a single step the other way), so spinning a row
 * all the way around back to its start (an exact multiple of `size`) costs
 * nothing, as no letters actually end up displaced.
 */
export class GameBoard extends Container {
  private readonly size: number;
  private readonly cellSize: number;
  private readonly words: string[];
  private readonly boardMask: Graphics;
  private readonly cellsLayer: Container;

  /** cells[row][col] = the tile currently occupying that slot. */
  private cells: GameCell[][];

  private dragging = false;
  private dragAxis: DragAxis | null = null;
  private dragIndex = 0;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragDelta = 0;
  private pendingRow = 0;
  private pendingCol = 0;

  /** Words (uppercased) that have been fully matched and locked on the board. */
  private readonly solvedWords = new Set<string>();
  /** Distinct display color assigned to each word, shared with the word list UI. */
  private readonly wordColors: ReadonlyMap<string, number>;

  private readonly onSolvedWordsChanged?: (solved: ReadonlySet<string>) => void;
  private readonly onMoveMade?: (movesUsed: number, moveLimit: number) => void;
  private readonly onMovePreview?: (cost: number | null) => void;

  private movesUsed = 0;
  private readonly moveLimitValue: number;

  constructor(
    level: LevelConfig,
    cellSize: number,
    events: GameBoardEvents = {},
  ) {
    super();
    this.size = level.size;
    this.cellSize = cellSize;
    this.words = level.words.map((word) => word.toUpperCase());
    this.wordColors = createWordColorMap(this.words);
    this.onSolvedWordsChanged = events.onSolvedWordsChanged;
    this.onMoveMade = events.onMoveMade;
    this.onMovePreview = events.onMovePreview;

    const { grid: letters, moveLimit } = generateBoard(level);
    this.moveLimitValue = moveLimit;

    // Cell tiles live in their own masked layer so the arrow buttons (added
    // directly to `this` below) can sit outside the board's bounds without
    // being clipped by the board mask.
    this.cellsLayer = new Container();
    this.addChild(this.cellsLayer);

    this.boardMask = new Graphics()
      .rect(0, 0, this.size * cellSize, this.size * cellSize)
      .fill(0xffffff);
    this.cellsLayer.addChild(this.boardMask);
    this.cellsLayer.mask = this.boardMask;

    this.cells = [];
    for (let row = 0; row < this.size; row++) {
      const rowCells: GameCell[] = [];
      for (let col = 0; col < this.size; col++) {
        const cell = new GameCell(letters[row][col], row, col, cellSize);
        cell.position.set(col * cellSize, row * cellSize);
        cell.on("pointerdown", (event: FederatedPointerEvent) =>
          this.handlePointerDown(event, cell.row, cell.col),
        );
        this.cellsLayer.addChild(cell);
        rowCells.push(cell);
      }
      this.cells.push(rowCells);
    }

    this.createArrows();

    this.eventMode = "static";
    this.on("globalpointermove", this.handlePointerMove);
    this.on("pointerup", this.handlePointerUp);
    this.on("pointerupoutside", this.handlePointerUp);
  }

  /** Words for the current level (uppercased), in their original order. */
  get wordList(): readonly string[] {
    return this.words;
  }

  /** Words that are currently fully matched and locked on the board. */
  get solved(): ReadonlySet<string> {
    return this.solvedWords;
  }

  /** Number of moves consumed so far (sum of circular shift distances). */
  get moves(): number {
    return this.movesUsed;
  }

  /** The player's move budget for this level (min. scramble depth + 30%). */
  get moveLimit(): number {
    return this.moveLimitValue;
  }

  /** Per-word display colors, shared with the word list UI so colors match. */
  get colorsByWord(): ReadonlyMap<string, number> {
    return this.wordColors;
  }

  private handlePointerDown(
    _event: FederatedPointerEvent,
    row: number,
    col: number,
  ): void {
    if (this.dragging) return;
    this.dragging = true;
    this.dragAxis = null;
    this.dragDelta = 0;
    this.pendingRow = row;
    this.pendingCol = col;
    this.dragStartX = _event.global.x;
    this.dragStartY = _event.global.y;
  }

  private handlePointerMove = (event: FederatedPointerEvent): void => {
    if (!this.dragging) return;

    const dx = event.global.x - this.dragStartX;
    const dy = event.global.y - this.dragStartY;

    if (!this.dragAxis) {
      if (
        Math.abs(dx) < SWIPE_AXIS_THRESHOLD &&
        Math.abs(dy) < SWIPE_AXIS_THRESHOLD
      )
        return;
      this.dragAxis = Math.abs(dx) > Math.abs(dy) ? "row" : "col";
      this.dragIndex =
        this.dragAxis === "row" ? this.pendingRow : this.pendingCol;
    }

    const total = this.size * this.cellSize;
    this.dragDelta = this.dragAxis === "row" ? dx : dy;

    const line = this.getLine(this.dragAxis, this.dragIndex);
    for (const cell of line) {
      const base =
        (this.dragAxis === "row" ? cell.col : cell.row) * this.cellSize;
      const wrapped = (((base + this.dragDelta) % total) + total) % total;
      if (this.dragAxis === "row") cell.position.x = wrapped;
      else cell.position.y = wrapped;
    }

    const steps = Math.round(this.dragDelta / this.cellSize);
    const cost = this.moveCost(steps);
    this.onMovePreview?.(cost > 0 ? cost : null);
  };

  private handlePointerUp = (): void => {
    if (!this.dragging) return;
    this.dragging = false;

    const axis = this.dragAxis;
    this.dragAxis = null;
    if (!axis) return;

    const index = this.dragIndex;
    const steps = Math.round(this.dragDelta / this.cellSize);

    if (steps !== 0) {
      if (axis === "row") this.shiftRow(index, steps);
      else this.shiftCol(index, steps);
    }

    this.animateSnap(this.getLine(axis, index));
    this.onMovePreview?.(null);

    if (steps !== 0) {
      this.commitMove(steps);
    }
  };

  /** Circular shift distance a move of `steps` actually costs (0 for a no-op or full turn). */
  private moveCost(steps: number): number {
    const size = this.size;
    const effective = ((steps % size) + size) % size;
    return Math.min(effective, size - effective);
  }

  /** Applies the move's cost to the counter and re-checks for new matches. */
  private commitMove(steps: number): void {
    const cost = this.moveCost(steps);
    if (cost === 0) return; // full turn (or no-op): nothing actually moved

    this.movesUsed += cost;
    this.onMoveMade?.(this.movesUsed, this.moveLimitValue);

    const solvedBefore = this.solvedWords.size;
    this.checkMatches();
    if (this.solvedWords.size !== solvedBefore) {
      this.onSolvedWordsChanged?.(this.solvedWords);
    }
  }

  private getLine(axis: DragAxis, index: number): GameCell[] {
    return axis === "row"
      ? this.cells[index]
      : this.cells.map((row) => row[index]);
  }

  /** Cyclically shifts a row; `steps > 0` moves cells toward higher column indices (rightward). */
  private shiftRow(row: number, steps: number): void {
    const size = this.size;
    const oldRow = this.cells[row];
    const newRow: GameCell[] = new Array(size);
    for (let col = 0; col < size; col++) {
      const newCol = (((col + steps) % size) + size) % size;
      newRow[newCol] = oldRow[col];
      oldRow[col].col = newCol;
    }
    this.cells[row] = newRow;
  }

  /** Cyclically shifts a column; `steps > 0` moves cells toward higher row indices (downward). */
  private shiftCol(col: number, steps: number): void {
    const size = this.size;
    const oldCol = this.cells.map((row) => row[col]);
    const newCol: GameCell[] = new Array(size);
    for (let row = 0; row < size; row++) {
      const newRow = (((row + steps) % size) + size) % size;
      newCol[newRow] = oldCol[row];
      oldCol[row].row = newRow;
    }
    for (let row = 0; row < size; row++) {
      this.cells[row][col] = newCol[row];
    }
  }

  /** Animates cells sliding from their current (drag-offset) position back to their grid slot. */
  private animateSnap(cells: GameCell[]): void {
    const from = cells.map((cell) => ({
      x: cell.position.x,
      y: cell.position.y,
    }));
    const to = cells.map((cell) => ({
      x: cell.col * this.cellSize,
      y: cell.row * this.cellSize,
    }));
    let elapsed = 0;

    const tick = (ticker: Ticker): void => {
      elapsed += ticker.deltaMS;
      const t = Math.min(1, elapsed / SNAP_DURATION_MS);
      const eased = 1 - (1 - t) ** 3;
      cells.forEach((cell, i) => {
        cell.position.x = from[i].x + (to[i].x - from[i].x) * eased;
        cell.position.y = from[i].y + (to[i].y - from[i].y) * eased;
      });
      if (t >= 1) Ticker.shared.remove(tick);
    };
    Ticker.shared.add(tick);
  }

  /** Re-checks every row and column for word matches, locking newly found cells. */
  private checkMatches(): void {
    for (let row = 0; row < this.size; row++) {
      this.checkLine(this.cells[row]);
    }
    for (let col = 0; col < this.size; col++) {
      this.checkLine(this.getLine("col", col));
    }
  }

  private checkLine(cells: GameCell[]): void {
    const letters = cells.map((cell) => cell.letter);
    const lockedIndices = new Set<number>();
    cells.forEach((cell, i) => {
      if (cell.matched) lockedIndices.add(i);
    });

    const matches = findMatches(letters, this.words, lockedIndices);
    for (const match of matches) {
      this.solvedWords.add(match.word);
      const color = this.wordColors.get(match.word) ?? null;
      for (let i = match.start; i < match.end; i++) {
        cells[i].matched = true;
        cells[i].matchColor = color;
        cells[i].redraw(this.cellSize);
      }
    }
  }

  /** Builds the row/column arrow buttons that sit just outside the board's edges. */
  private createArrows(): void {
    const boardSize = this.size * this.cellSize;

    for (let row = 0; row < this.size; row++) {
      const y = row * this.cellSize + this.cellSize / 2;
      this.addChild(
        this.createArrow(0, y, "left", () =>
          this.handleArrowClick("row", row, -1),
        ),
        this.createArrow(boardSize, y, "right", () =>
          this.handleArrowClick("row", row, 1),
        ),
      );
    }
    for (let col = 0; col < this.size; col++) {
      const x = col * this.cellSize + this.cellSize / 2;
      this.addChild(
        this.createArrow(x, 0, "up", () =>
          this.handleArrowClick("col", col, -1),
        ),
        this.createArrow(x, boardSize, "down", () =>
          this.handleArrowClick("col", col, 1),
        ),
      );
    }
  }

  /** Creates a single clickable triangular arrow button pointing away from the board edge. */
  private createArrow(
    edgeX: number,
    edgeY: number,
    side: ArrowSide,
    onClick: () => void,
  ): Graphics {
    const size = Math.max(12, this.cellSize * 0.32);
    const gap = size * 0.7;
    const half = size / 2;

    const arrow = new Graphics()
      .poly([-half, -half, half, 0, -half, half])
      .fill(ARROW_COLOR);

    let x = edgeX;
    let y = edgeY;
    switch (side) {
      case "left":
        x = edgeX - gap;
        arrow.rotation = Math.PI;
        break;
      case "right":
        x = edgeX + gap;
        arrow.rotation = 0;
        break;
      case "up":
        y = edgeY - gap;
        arrow.rotation = -Math.PI / 2;
        break;
      case "down":
        y = edgeY + gap;
        arrow.rotation = Math.PI / 2;
        break;
    }

    arrow.position.set(x, y);
    arrow.eventMode = "static";
    arrow.cursor = "pointer";
    arrow.on("pointertap", onClick);
    arrow.on("pointerover", () => (arrow.tint = ARROW_HOVER_COLOR));
    arrow.on("pointerout", () => (arrow.tint = 0xffffff));

    return arrow;
  }

  private handleArrowClick(
    axis: DragAxis,
    index: number,
    direction: ArrowDirection,
  ): void {
    if (this.dragging) return;

    if (axis === "row") this.shiftRow(index, direction);
    else this.shiftCol(index, direction);

    this.animateSnap(this.getLine(axis, index));
    this.commitMove(direction);
  }
}
