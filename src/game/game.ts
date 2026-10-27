import { type Player } from "../entities/player/player.ts";

enum PlayerId {
  P1 = "p1",
  P2 = "p2",
}

enum GamePhase {
  PLACEMENT = "placement",
  PLAYING = "playing",
  OVER = "over",
}

export type GameState = {
  readonly p1: Player;
  readonly p2: Player;
  readonly turn: PlayerId;
  readonly winner: PlayerId | null;
  readonly phase: GamePhase;
};
