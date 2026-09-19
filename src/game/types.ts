/** Configuration describing a single level. */
export interface LevelConfig {
  /** Stable identifier, used for navigation between menu and game scenes. */
  id: string;
  /** Display name shown in the level-select menu. */
  title: string;
  /** Grid is `size x size` cells. Must be between 5 and 10 inclusive. */
  size: number;
  /**
   * Word list for this level. Each word must be exactly `size` letters long
   * and there must be exactly `size` words, so that in the solved layout
   * every row is one complete word (see `game/generator.ts`).
   */
  words: string[];
}
