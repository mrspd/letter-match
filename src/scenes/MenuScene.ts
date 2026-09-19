import { Application, Container, Graphics, Text } from "pixi.js";
import { levels } from "../game/levels";
import type { LevelConfig } from "../game/types";

const CARD_WIDTH = 260;
const CARD_HEIGHT = 90;
const CARD_GAP = 24;
const CARDS_PER_ROW = 2;
const TITLE_MARGIN_TOP = 70;
const GRID_MARGIN_TOP = 160;

/**
 * Level-select screen: a title plus a grid of clickable level cards, one per
 * entry in `levels`. Selecting a card invokes `onLevelSelected`.
 */
export class MenuScene extends Container {
  private readonly app: Application;
  private readonly layoutTick: () => void;
  private readonly title: Text;
  private readonly cards: Container[] = [];

  constructor(app: Application, onLevelSelected: (level: LevelConfig) => void) {
    super();
    this.app = app;

    this.title = new Text({
      text: "Собери слова",
      style: {
        fill: 0xecf0f1,
        fontSize: 40,
        fontWeight: "bold",
        fontFamily: "Arial, sans-serif",
      },
    });
    this.title.anchor.set(0.5, 0);
    this.addChild(this.title);

    for (const level of levels) {
      const card = this.createCard(level, () => onLevelSelected(level));
      this.cards.push(card);
      this.addChild(card);
    }

    this.layoutTick = () => this.layout();
    app.ticker.add(this.layoutTick);
    this.layout();
  }

  private createCard(level: LevelConfig, onSelect: () => void): Container {
    const card = new Container();

    const bg = new Graphics()
      .roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, 12)
      .fill(0x2f3640)
      .stroke({ width: 2, color: 0x57606f });
    card.addChild(bg);

    const title = new Text({
      text: level.title,
      style: {
        fill: 0xecf0f1,
        fontSize: 22,
        fontWeight: "bold",
        fontFamily: "Arial, sans-serif",
      },
    });
    title.anchor.set(0.5, 0);
    title.position.set(CARD_WIDTH / 2, 16);
    card.addChild(title);

    const subtitle = new Text({
      text: `Поле ${level.size}×${level.size}`,
      style: {
        fill: 0xbdc3c7,
        fontSize: 16,
        fontFamily: "Arial, sans-serif",
      },
    });
    subtitle.anchor.set(0.5, 0);
    subtitle.position.set(CARD_WIDTH / 2, 52);
    card.addChild(subtitle);

    card.eventMode = "static";
    card.cursor = "pointer";
    card.on("pointertap", onSelect);
    card.on("pointerover", () => (bg.tint = 0x3a4150));
    card.on("pointerout", () => (bg.tint = 0xffffff));

    return card;
  }

  private layout(): void {
    const width = this.app.screen.width;

    this.title.position.set(width / 2, TITLE_MARGIN_TOP);

    const perRow =
      width >= CARDS_PER_ROW * CARD_WIDTH + (CARDS_PER_ROW - 1) * CARD_GAP
        ? CARDS_PER_ROW
        : 1;
    const gridWidth = perRow * CARD_WIDTH + (perRow - 1) * CARD_GAP;
    const startX = (width - gridWidth) / 2;

    this.cards.forEach((card, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      card.position.set(
        startX + col * (CARD_WIDTH + CARD_GAP),
        GRID_MARGIN_TOP + row * (CARD_HEIGHT + CARD_GAP),
      );
    });
  }

  destroy(): void {
    this.app.ticker.remove(this.layoutTick);
    super.destroy({ children: true });
  }
}
