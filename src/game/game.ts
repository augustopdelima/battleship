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

export function createGame(p1: Player, p2: Player): GameState {
  return {
    p1,
    p2,
    phase: GamePhase.PLACEMENT,
    turn: PlayerId.P1,
    winner: null,
  };
}

export function startGame(state: GameState): GameState {
  if (state.phase !== GamePhase.PLACEMENT) return state;

  return {
    ...state,
    phase: GamePhase.PLAYING,
  };
}
