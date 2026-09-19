import type { LevelConfig } from "./types";

/**
 * All levels use the "one word per row" model: exactly `size` words, each
 * exactly `size` letters long. This keeps the solved layout unambiguous
 * (row i == words[i]) and every word match is a whole-line match - see
 * `game/generator.ts` for how this is used to build and scramble the board.
 */
export const levels: LevelConfig[] = [
  {
    id: "fruits-5",
    title: "Фрукты (5×5)",
    size: 5,
    words: ["ЛИМОН", "ГРУША", "МАНГО", "СЛИВА", "ФИНИК"],
  },
  {
    id: "animals-6",
    title: "Животные (6×6)",
    size: 6,
    words: ["БАРСУК", "ЛИСИЦА", "ГАЗЕЛЬ", "СОБАКА", "ЛОШАДЬ", "КОРОВА"],
  },
  {
    id: "transport-7",
    title: "Транспорт (7×7)",
    size: 7,
    words: [
      "АВТОБУС",
      "САМОЛЕТ",
      "ТРАКТОР",
      "ТРАМВАЙ",
      "КОМБАЙН",
      "ПАРОВОЗ",
      "ПАРОХОД",
    ],
  },
  {
    id: "mixed-8",
    title: "Микс (8×8)",
    size: 8,
    words: [
      "ЧЕРЕПАХА",
      "ВИНОГРАД",
      "КРОКОДИЛ",
      "ОБЕЗЬЯНА",
      "ДИНОЗАВР",
      "ПОМИДОРЫ",
      "ПАРОХОДЫ",
      "МОРКОВКА",
    ],
  },
];
