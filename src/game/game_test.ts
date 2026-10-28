import {
  assert,
  assertEquals,
  assertNotEquals,
  assertStrictEquals,
} from "@std/assert";
import {
  createGame,
  startGame,
  playAttack,
  GamePhase,
  PlayerId,
  GameTurnStatus,
} from "./game.ts";
import { createPlayer, placePlayerShip } from "../entities/player/player.ts";
import { createShip } from "../entities/ship/ship.ts";

const createReal = (id: string) => createPlayer(id, "real");

const setupGame = () => {
  let p1 = createReal("p1");
  let p2 = createReal("p2");

  const p1Ship = placePlayerShip(p1, createShip("p1-ship", "patrolBoat"), {
    coordinates: { row: 0, col: 0 },
    orientation: "horizontal",
  });
  assert(p1Ship.success);
  p1 = p1Ship.player;

  const p2Ship = placePlayerShip(p2, createShip("p2-ship", "patrolBoat"), {
    coordinates: { row: 0, col: 0 },
    orientation: "horizontal",
  });
  assert(p2Ship.success);
  p2 = p2Ship.player;

  const game = startGame(createGame(p1, p2));
  return game;
};

Deno.test("createGame - starts in placement with p1 turn", () => {
  const p1 = createReal("p1");
  const p2 = createReal("p2");
  const game = createGame(p1, p2);

  assertEquals(game.phase, GamePhase.PLACEMENT);
  assertEquals(game.turn, PlayerId.P1);
  assertEquals(game.winner, null);
  assertStrictEquals(game.p1, p1);
  assertStrictEquals(game.p2, p2);
});

Deno.test("startGame - moves from placement to playing", () => {
  const game = startGame(createGame(createReal("p1"), createReal("p2")));
  assertEquals(game.phase, GamePhase.PLAYING);
});

Deno.test("startGame - does not change phase if already playing or over", () => {
  const started = startGame(createGame(createReal("p1"), createReal("p2")));
  const again = startGame(started);
  assertEquals(again.phase, GamePhase.PLAYING);
  assertStrictEquals(again, started);
});

Deno.test("playAttack - rejects moves when not in playing phase", () => {
  const game = createGame(createReal("p1"), createReal("p2"));
  const result = playAttack(game, PlayerId.P1, PlayerId.P2, game.p2, {
    row: 0,
    col: 0,
  });

  assertEquals(result.type, GameTurnStatus.INVALID_MOVE);
  assertEquals(result.outcome.type, "invalid");
  assertStrictEquals(result.state, game);
});

Deno.test("playAttack - p1 attacks p2 and switches turn on miss", () => {
  const game = setupGame();
  const result = playAttack(game, PlayerId.P1, PlayerId.P2, game.p2, {
    row: 9,
    col: 9,
  });

  assertEquals(result.type, GameTurnStatus.CONTINUE);
  assertEquals(result.outcome.type, "miss");
  assertEquals(result.state.turn, PlayerId.P2);
  assertNotEquals(result.state.p2, game.p2);
  assertStrictEquals(result.state.p1, game.p1);
});

Deno.test("playAttack - p1 attacks p2 and switches turn on hit", () => {
  const game = setupGame();
  const result = playAttack(game, PlayerId.P1, PlayerId.P2, game.p2, {
    row: 0,
    col: 0,
  });

  assertEquals(result.type, GameTurnStatus.CONTINUE);
  assertEquals(result.outcome.type, "hit");
  assertEquals(result.state.turn, PlayerId.P2);
  assertNotEquals(result.state.p2, game.p2);
});

Deno.test("playAttack - does not switch turn on invalid coordinates", () => {
  const game = setupGame();
  const result = playAttack(game, PlayerId.P1, PlayerId.P2, game.p2, {
    row: -1,
    col: 0,
  });

  assertEquals(result.type, GameTurnStatus.INVALID_MOVE);
  assertEquals(result.outcome.type, "invalid");
  assertEquals(result.state.turn, PlayerId.P1);
  assertStrictEquals(result.state.p2, game.p2);
});

Deno.test("playAttack - does not switch turn on already attacked", () => {
  const game = setupGame();
  const first = playAttack(game, PlayerId.P1, PlayerId.P2, game.p2, {
    row: 9,
    col: 9,
  });
  assertEquals(first.outcome.type, "miss");

  const second = playAttack(first.state, PlayerId.P2, PlayerId.P1, first.state.p1, {
    row: 0,
    col: 0,
  });
  assertEquals(second.outcome.type, "hit");

  const third = playAttack(second.state, PlayerId.P1, PlayerId.P2, second.state.p2, {
    row: 9,
    col: 9,
  });

  assertEquals(third.type, GameTurnStatus.INVALID_MOVE);
  assertEquals(third.outcome.type, "already-attacked");
  assertEquals(third.state.turn, PlayerId.P1);
});

Deno.test("playAttack - game over when last ship is sunk", () => {
  const game = setupGame();
  const first = playAttack(game, PlayerId.P1, PlayerId.P2, game.p2, {
    row: 0,
    col: 0,
  });
  assertEquals(first.outcome.type, "hit");
  if (first.outcome.type !== "hit") return;

  const second = playAttack(first.state, PlayerId.P1, PlayerId.P2, first.state.p2, {
    row: 0,
    col: 1,
  });

  assertEquals(second.type, GameTurnStatus.GAME_OVER);
  assertEquals(second.outcome.type, "hit");
  if (second.outcome.type !== "hit") return;
  assertEquals(second.outcome.sunk, true);
  assertEquals(second.state.phase, GamePhase.OVER);
  assertEquals(second.state.winner, PlayerId.P1);
  assertEquals(second.state.turn, PlayerId.P1);
});

Deno.test("playAttack - only defender changes on valid attack", () => {
  const game = setupGame();
  const result = playAttack(game, PlayerId.P1, PlayerId.P2, game.p2, {
    row: 9,
    col: 9,
  });

  assertEquals(result.outcome.type, "miss");
  assertStrictEquals(result.state.p1, game.p1);
  assertNotEquals(result.state.p2, game.p2);
});
