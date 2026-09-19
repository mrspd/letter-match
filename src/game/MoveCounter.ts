import { Container, Text } from "pixi.js";

const NORMAL_COLOR = 0xecf0f1;
const OVER_LIMIT_COLOR = 0xe74c3c;
const PREVIEW_COLOR = 0xf39c12;
const PREVIEW_GAP = 8;

/**
 * Small "Ходы: X / Y" indicator meant to sit above the board, top-right
 * aligned. Turns red once the player exceeds the suggested move budget
 * (the budget is only a soft target, swiping still works past it).
 *
 * While the player is mid-swipe, a preview label ("-N") appears to the left
 * of the counter showing how many moves the current gesture would cost if
 * released right now.
 */
export class MoveCounter extends Container {
  private readonly mainText: Text;
  private readonly previewText: Text;

  constructor(moveLimit: number) {
    super();

    this.mainText = new Text({
      text: "",
      style: {
        fill: NORMAL_COLOR,
        fontSize: 20,
        fontWeight: "bold",
        fontFamily: "Arial, sans-serif",
      },
    });
    this.mainText.anchor.set(1, 1);

    this.previewText = new Text({
      text: "",
      style: {
        fill: PREVIEW_COLOR,
        fontSize: 18,
        fontWeight: "bold",
        fontFamily: "Arial, sans-serif",
      },
    });
    this.previewText.anchor.set(1, 1);
    this.previewText.visible = false;

    this.addChild(this.mainText, this.previewText);
    this.update(0, moveLimit);
  }

  update(movesUsed: number, moveLimit: number): void {
    this.mainText.text = `Ходы: ${movesUsed} / ${moveLimit}`;
    this.mainText.style.fill =
      movesUsed > moveLimit ? OVER_LIMIT_COLOR : NORMAL_COLOR;
    this.layout();
  }

  /** Shows/hides the "-N" preview of what the in-progress gesture would cost. */
  showPreview(cost: number | null): void {
    if (cost && cost > 0) {
      this.previewText.text = `-${cost}`;
      this.previewText.visible = true;
    } else {
      this.previewText.visible = false;
    }
    this.layout();
  }

  private layout(): void {
    this.mainText.position.set(0, 0);
    this.previewText.position.set(-this.mainText.width - PREVIEW_GAP, 0);
  }
}
