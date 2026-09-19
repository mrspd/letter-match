import { Container, Graphics, Text } from "pixi.js";

const FONT_SIZE = 22;
const WORD_GAP_X = 24;
const LINE_GAP_Y = 12;
const UNSOLVED_COLOR = 0xbdc3c7;

interface WordNode {
  word: string;
  container: Container;
  text: Text;
  strike: Graphics;
}

/**
 * Displays the level's word list below the board, wrapped into centered rows
 * that fit within `maxWidth`. Words that have been fully matched on the
 * board are recolored (using that word's assigned color, matching its cells
 * on the board) and struck through via `setSolved`.
 */
export class WordListView extends Container {
  private readonly nodes: WordNode[] = [];
  private readonly wordColors: ReadonlyMap<string, number>;
  private totalHeight = 0;

  constructor(
    words: string[],
    maxWidth: number,
    wordColors: ReadonlyMap<string, number>,
  ) {
    super();
    this.wordColors = wordColors;

    for (const word of words) {
      const text = new Text({
        text: word,
        style: {
          fill: UNSOLVED_COLOR,
          fontSize: FONT_SIZE,
          fontWeight: "bold",
          fontFamily: "Arial, sans-serif",
        },
      });
      text.anchor.set(0, 0.5);

      const strike = new Graphics();
      strike.visible = false;

      const container = new Container();
      container.addChild(text, strike);
      this.addChild(container);

      this.nodes.push({ word, container, text, strike });
    }

    this.layout(maxWidth);
  }

  /** Total rendered height in pixels, useful for positioning content below this view. */
  get height(): number {
    return this.totalHeight;
  }

  /** Updates word styling to reflect which words are currently solved. */
  setSolved(solvedWords: ReadonlySet<string>): void {
    for (const node of this.nodes) {
      const isSolved = solvedWords.has(node.word);
      const color = this.wordColors.get(node.word) ?? UNSOLVED_COLOR;
      node.text.style.fill = isSolved ? color : UNSOLVED_COLOR;
      node.strike.visible = isSolved;
      if (isSolved) this.drawStrike(node, color);
    }
  }

  private layout(maxWidth: number): void {
    const lines: WordNode[][] = [];
    let currentLine: WordNode[] = [];
    let currentWidth = 0;

    for (const node of this.nodes) {
      const wordWidth = node.text.width;
      const extra = currentLine.length > 0 ? WORD_GAP_X : 0;

      if (
        currentLine.length > 0 &&
        currentWidth + extra + wordWidth > maxWidth
      ) {
        lines.push(currentLine);
        currentLine = [];
        currentWidth = 0;
      }

      currentWidth += (currentLine.length > 0 ? WORD_GAP_X : 0) + wordWidth;
      currentLine.push(node);
    }
    if (currentLine.length > 0) lines.push(currentLine);

    let y = 0;
    for (const line of lines) {
      const lineWidth = line.reduce(
        (sum, node, i) => sum + node.text.width + (i > 0 ? WORD_GAP_X : 0),
        0,
      );
      let x = (maxWidth - lineWidth) / 2;
      const lineHeight = Math.max(...line.map((node) => node.text.height));

      for (const node of line) {
        node.container.position.set(x, y + lineHeight / 2);
        x += node.text.width + WORD_GAP_X;
      }

      y += lineHeight + LINE_GAP_Y;
    }

    this.totalHeight = y > 0 ? y - LINE_GAP_Y : 0;
  }

  private drawStrike(node: WordNode, color: number): void {
    const width = node.text.width;
    node.strike.clear().moveTo(0, 0).lineTo(width, 0).stroke({
      width: 3,
      color,
    });
  }
}
