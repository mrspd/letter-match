import { Container, Graphics, Text } from "pixi.js";

const CELL_GAP = 4;
const NORMAL_BG = 0x2c3e50;
const NORMAL_TEXT = 0xecf0f1;
const MATCHED_TEXT = 0x1b1f24;

/**
 * A single tile on the board. Carries its own letter and "matched" state,
 * and always knows which grid slot (row/col) it currently occupies -
 * shifting a row/column reassigns these indices to the moved tiles.
 */
export class GameCell extends Container {
  readonly letter: string;
  matched = false;
  /** Color assigned to the word this cell is part of, once matched. */
  matchColor: number | null = null;
  row: number;
  col: number;

  private readonly bg: Graphics;
  private readonly letterText: Text;

  constructor(letter: string, row: number, col: number, cellSize: number) {
    super();
    this.letter = letter;
    this.row = row;
    this.col = col;

    this.bg = new Graphics();
    this.letterText = new Text({
      text: letter,
      style: {
        fill: NORMAL_TEXT,
        fontSize: Math.floor(cellSize * 0.48),
        fontWeight: "bold",
        fontFamily: "Arial, sans-serif",
      },
    });
    this.letterText.anchor.set(0.5);
    this.letterText.position.set(cellSize / 2, cellSize / 2);

    this.addChild(this.bg, this.letterText);
    this.redraw(cellSize);

    this.eventMode = "static";
    this.cursor = "grab";
  }

  /** Redraws the background/text style to reflect current matched state or a new size. */
  redraw(cellSize: number): void {
    this.bg.clear();
    this.bg
      .roundRect(0, 0, cellSize - CELL_GAP, cellSize - CELL_GAP, 8)
      .fill(this.matched ? (this.matchColor ?? NORMAL_BG) : NORMAL_BG);
    this.letterText.style.fill = this.matched ? MATCHED_TEXT : NORMAL_TEXT;
  }
}
