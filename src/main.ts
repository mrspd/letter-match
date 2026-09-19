import { Application } from "pixi.js";
import { GameScene } from "./scenes/GameScene";
import { MenuScene } from "./scenes/MenuScene";
import type { LevelConfig } from "./game/types";

(async () => {
  const app = new Application();
  await app.init({ background: "#1e272e", resizeTo: window, antialias: true });
  document.getElementById("pixi-container")!.appendChild(app.canvas);

  const showMenu = (): void => {
    app.stage.removeChildren().forEach((child) => child.destroy());
    const menu = new MenuScene(app, (level: LevelConfig) => showGame(level));
    app.stage.addChild(menu);
  };

  const showGame = (level: LevelConfig): void => {
    app.stage.removeChildren().forEach((child) => child.destroy());
    const game = new GameScene(app, level, showMenu);
    app.stage.addChild(game);
  };

  showMenu();
})();
