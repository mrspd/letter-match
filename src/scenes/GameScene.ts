import { Application, Container, Text } from "pixi.js";
import { GameBoard } from "../game/GameBoard";
import { MoveCounter } from "../game/MoveCounter";
import { WordListView } from "../game/WordListView";
import type { LevelConfig } from "../game/types";
import { createWordColorMap } from "../game/wordColors";

const BOARD_TO_LIST_GAP = 40;
const COUNTER_TO_BOARD_GAP = 40;
const MAX_CELL_SIZE = 64;
const MIN_CELL_SIZE = 32;
const SIDE_MARGIN = 56; // leaves room for the row-shift arrow buttons
const TOP_MARGIN = 110; // leaves room for the back button + move counter + up-arrows

/**
 * Full gameplay screen for a single level: board, word list, move counter
 * and a back button to return to the level menu. Handles its own layout on
 * every frame so it stays centered as the window resizes.
 */
export class GameScene extends Container {
  private readonly app: Application;
  private readonly board: GameBoard;
  private readonly wordList: WordListView;
  private readonly moveCounter: MoveCounter;
  private readonly winText: Text;
  private readonly backButton: Text;
  private readonly cellSize: number;
  private readonly boardWidth: number;
  private readonly layoutTick: () => void;

  constructor(app: Application, level: LevelConfig, onBack: () => void) {
    super();
    this.app = app;

    const availableWidth = Math.max(
      MIN_CELL_SIZE * level.size,
      app.screen.width - SIDE_MARGIN * 2,
    );
    this.cellSize = Math.max(
      MIN_CELL_SIZE,
      Math.min(MAX_CELL_SIZE, Math.floor(availableWidth / level.size)),
    );
    this.boardWidth = level.size * this.cellSize;

    this.wordList = new WordListView(
      level.words,
      this.boardWidth,
      createWordColorMap(level.words),
    );
    this.board = new GameBoard(level, this.cellSize, {
      onSolvedWordsChanged: (solved) => {
        this.wordList.setSolved(solved);
        this.winText.visible = solved.size === level.words.length;
      },
      onMoveMade: (movesUsed, moveLimit) =>
        this.moveCounter.update(movesUsed, moveLimit),
      onMovePreview: (cost) => this.moveCounter.showPreview(cost),
    });
    this.moveCounter = new MoveCounter(this.board.moveLimit);

    const backButton = new Text({
      text: "← Назад",
      style: {
        fill: 0xecf0f1,
        fontSize: 22,
        fontWeight: "bold",
        fontFamily: "Arial, sans-serif",
      },
    });
    backButton.eventMode = "static";
    backButton.cursor = "pointer";
    backButton.on("pointertap", onBack);
    this.backButton = backButton;

    this.winText = new Text({
      text: `Уровень «${level.title}» пройден!`,
      style: {
        fill: 0x2ecc71,
        fontSize: 26,
        fontWeight: "bold",
        fontFamily: "Arial, sans-serif",
      },
    });
    this.winText.anchor.set(0.5, 0);
    this.winText.visible = false;

    this.addChild(
      this.board,
      this.wordList,
      this.moveCounter,
      backButton,
      this.winText,
    );

    this.layoutTick = () => this.layout();
    app.ticker.add(this.layoutTick);
    this.layout();
  }

  private layout(): void {
    const boardX = (this.app.screen.width - this.boardWidth) / 2;
    const boardY = TOP_MARGIN;

    this.board.position.set(boardX, boardY);
    this.wordList.position.set(
      boardX,
      boardY + this.boardWidth + BOARD_TO_LIST_GAP,
    );
    this.moveCounter.position.set(
      boardX + this.boardWidth,
      boardY - COUNTER_TO_BOARD_GAP,
    );
    this.backButton.position.set(SIDE_MARGIN, SIDE_MARGIN / 2);
    this.winText.position.set(
      this.app.screen.width / 2,
      boardY + this.boardWidth + BOARD_TO_LIST_GAP + this.wordList.height + 16,
    );
  }

  destroy(): void {
    this.app.ticker.remove(this.layoutTick);
    super.destroy({ children: true });
  }
}
