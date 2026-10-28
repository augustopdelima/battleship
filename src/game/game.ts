import { Coordinates } from "../entities/board/board.ts";
import {
  AttackOutcome,
  hasLost,
  playerReceiveAttack,
  type Player,
} from "../entities/player/player.ts";

export enum PlayerId {
  P1 = "p1",
  P2 = "p2",
}

export enum GamePhase {
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

export enum GameTurnStatus {
  CONTINUE = "continue",
  GAME_OVER = "game_over",
  INVALID_MOVE = "invalid_move",
}

export type GameTurnResult = {
  type: GameTurnStatus;
  state: GameState;
  outcome: AttackOutcome;
};

function setDefender(
  state: GameState,
  defenderId: PlayerId,
  defender: Player,
): GameState {
  if (defenderId === PlayerId.P1) {
    return { ...state, p1: defender };
  }

  return { ...state, p2: defender };
}

function switchTurn(state: GameState, nextTurn: PlayerId): GameState {
  return { ...state, turn: nextTurn };
}

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

export function playAttack(
  state: GameState,
  attackerId: PlayerId,
  defenderId: PlayerId,
  defender: Player,
  coords: Coordinates,
): GameTurnResult {
  if (state.phase !== GamePhase.PLAYING) {
    return {
      type: GameTurnStatus.INVALID_MOVE,
      state,
      outcome: { type: "invalid" },
    };
  }

  const attack = playerReceiveAttack(defender, coords);

  if (attack.outcome.type === "invalid" || attack.outcome.type === "already-attacked") {
    const nextState = setDefender(state, defenderId, attack.player);

    return {
      type: GameTurnStatus.INVALID_MOVE,
      state: nextState,
      outcome: attack.outcome,
    };
  }

  let nextState = setDefender(state, defenderId, attack.player);
  const updatedDefender = attack.player;

  if (hasLost(updatedDefender)) {
    return {
      type: GameTurnStatus.GAME_OVER,
      state: {
        ...nextState,
        phase: GamePhase.OVER,
        winner: attackerId,
        turn: attackerId,
      },
      outcome: attack.outcome,
    };
  }

  nextState = switchTurn(nextState, defenderId);

  return {
    type: GameTurnStatus.CONTINUE,
    state: nextState,
    outcome: attack.outcome,
  };
}
