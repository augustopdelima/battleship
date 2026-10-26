import {
  assert,
  assertEquals,
  assertNotEquals,
  assertStrictEquals,
  assertThrows,
} from "@std/assert";
import { createShip } from "../ship/ship.ts";
import {
  createPlayer,
  placePlayerShip,
  type Player,
  playerReceiveAttack,
} from "./player.ts";
import { createBoard, placeShip, receiveAttack } from "../board/board.ts";
import { hitShip } from "../fleet/fleet.ts";

const createEmptyPlayer = () => createPlayer("player-1", "real");

const assertEmptyBoard = (player: Player) => {
  player.board.cells.forEach((row) => {
    row.forEach((cell) => {
      assertEquals(cell.shipId, null);
    });
  });
};

Deno.test("createPlayer - create a real player", () => {
  const player = createPlayer("Player1", "real");

  assertEquals(player.id, "Player1");
  assertEquals(player.type, "real");
  assertEquals(player.fleet.size, 0);

  assertEquals(player.board.cells.length, 10);
  player.board.cells.forEach((col) => {
    assertEquals(col.length, 10);
  });

  assertEmptyBoard(player);
});

Deno.test("createPlayer - create a computer player", () => {
  const player = createPlayer("Computer1", "computer");
  assertEquals(player.id, "Computer1");
  assertEquals(player.type, "computer");
});

Deno.test("placePlayerShip - places a ship on the board and in the fleet", () => {
  const player = createEmptyPlayer();
  const ship = createShip("ship-1", "patrolBoat");

  const result = placePlayerShip(player, ship, {
    coordinates: { row: 0, col: 0 },
    orientation: "vertical",
  });

  assert(result.success);

  assertEquals(result.player.fleet.size, 1);
  assertStrictEquals(result.player.fleet.get("ship-1"), ship);

  assertEquals(result.player.board.cells[0][0].shipId, "ship-1");
  assertEquals(result.player.board.cells[1][0].shipId, "ship-1");
});

Deno.test("placePlayerShip - supports horizontal placement", () => {
  const player = createEmptyPlayer();
  const ship = createShip("ship-1", "patrolBoat");

  const result = placePlayerShip(player, ship, {
    coordinates: { row: 4, col: 5 },
    orientation: "horizontal",
  });

  assert(result.success);

  assertEquals(result.player.board.cells[4][5].shipId, "ship-1");
  assertEquals(result.player.board.cells[4][6].shipId, "ship-1");
});

Deno.test("placePlayerShip - does not mutate the original player", () => {
  const player = createEmptyPlayer();
  const ship = createShip("ship-1", "patrolBoat");

  const result = placePlayerShip(player, ship, {
    coordinates: { row: 0, col: 0 },
    orientation: "vertical",
  });

  assert(result.success);

  assertEquals(player.fleet.size, 0);
  assertEmptyBoard(player);

  assertNotEquals(result.player, player);
  assertNotEquals(result.player.board, player.board);
  assertNotEquals(result.player.fleet, player.fleet);
});

Deno.test("placePlayerShip - rejects a ship outside the board", () => {
  const player = createEmptyPlayer();
  const ship = createShip("ship-1", "patrolBoat");

  const result = placePlayerShip(player, ship, {
    coordinates: { row: 9, col: 0 },
    orientation: "vertical",
  });

  assertEquals(result.success, false);
  assertEquals(result.player.fleet.size, 0);
  assertStrictEquals(result.player, player);
  assertEmptyBoard(result.player);
});

Deno.test("placePlayerShip - rejects an overlapping ship without adding it to the fleet", () => {
  const player = createEmptyPlayer();

  const first = placePlayerShip(player, createShip("ship-1", "patrolBoat"), {
    coordinates: { row: 0, col: 0 },
    orientation: "horizontal",
  });

  assert(first.success);

  const second = placePlayerShip(
    first.player,
    createShip("ship-2", "destroyer"),
    {
      coordinates: { row: 0, col: 1 },
      orientation: "vertical",
    },
  );

  assert(!second.success);
  assertStrictEquals(second.player, first.player);
  assertEquals(second.player.fleet.size, 1);
  assertEquals(second.player.board.cells[1][1].shipId, null);
});

Deno.test("placePlayerShip - rejects a duplicate ship ID", () => {
  const player = createEmptyPlayer();

  const first = placePlayerShip(player, createShip("ship-1", "patrolBoat"), {
    coordinates: { row: 0, col: 0 },
    orientation: "vertical",
  });

  assert(first.success);

  const duplicate = placePlayerShip(
    first.player,
    createShip("ship-1", "destroyer"),
    {
      coordinates: { row: 4, col: 4 },
      orientation: "vertical",
    },
  );

  assert(!duplicate.success);
  assertStrictEquals(duplicate.player, first.player);
  assertEquals(duplicate.player.fleet.size, 1);
  assertEquals(duplicate.player.board.cells[4][4].shipId, null);
});

Deno.test("placePlayerShip - rejects a ship when its fleet limit is reached", () => {
  const player = createEmptyPlayer();

  const first = placePlayerShip(player, createShip("patrol-1", "patrolBoat"), {
    coordinates: { row: 0, col: 0 },
    orientation: "vertical",
  });

  assert(first.success);

  const second = placePlayerShip(
    first.player,
    createShip("patrol-2", "patrolBoat"),
    {
      coordinates: { row: 0, col: 2 },
      orientation: "vertical",
    },
  );

  assert(second.success);

  const third = placePlayerShip(
    second.player,
    createShip("patrol-3", "patrolBoat"),
    {
      coordinates: { row: 0, col: 4 },
      orientation: "vertical",
    },
  );

  assert(!third.success);
  assertStrictEquals(third.player, second.player);
  assertEquals(third.player.fleet.size, 2);
  assertEquals(third.player.board.cells[0][4].shipId, null);
});

Deno.test("placePlayerShip - the board ship ID can be used to hit the fleet ship", () => {
  const player = createEmptyPlayer();
  const ship = createShip("ship-1", "patrolBoat");

  const placed = placePlayerShip(player, ship, {
    coordinates: { row: 0, col: 0 },
    orientation: "vertical",
  });

  assert(placed.success);

  const attack = receiveAttack(placed.player.board, { row: 0, col: 0 });

  assert(attack !== null);
  assertEquals(attack!.type, "hit");

  if (attack!.type !== "hit") return;

  assertEquals(attack!.shipId, ship.getShipId());

  const hit = hitShip(placed.player.fleet, attack!.shipId);

  assert(hit.success);
  assertEquals(hit.fleet.get("ship-1")?.getHits(), 1);
});

Deno.test("playerReceiveAttack - records a miss without touching the fleet", () => {
  const player = createPlayer("player-1", "real");
  const placed = placePlayerShip(player, createShip("ship-1", "patrolBoat"), {
    coordinates: { row: 0, col: 0 },
    orientation: "vertical",
  });

  assert(placed.success);

  const result = playerReceiveAttack(placed.player, { row: 5, col: 5 });

  assertEquals(result.outcome.type, "miss");
  assertEquals(result.player.board.cells[5][5].attacked, true);
  assertEquals(result.player.fleet.get("ship-1")?.getHits(), 0);

  // Original state is untouched.
  assertEquals(placed.player.board.cells[5][5].attacked, false);
  assertNotEquals(result.player, placed.player);
});

Deno.test("playerReceiveAttack - records a hit on both board and fleet", () => {
  const player = createPlayer("player-1", "real");
  const placed = placePlayerShip(player, createShip("ship-1", "patrolBoat"), {
    coordinates: { row: 0, col: 0 },
    orientation: "vertical",
  });

  assert(placed.success);

  const result = playerReceiveAttack(placed.player, { row: 0, col: 0 });

  assert(result.outcome.type === "hit");

  assertEquals(result.outcome.shipId, "ship-1");
  assertEquals(result.outcome.sunk, false);
  assertEquals(result.player.board.cells[0][0].attacked, true);
  assertEquals(result.player.fleet.get("ship-1")?.getHits(), 1);

  // Original state is untouched.
  assertEquals(placed.player.board.cells[0][0].attacked, false);
  assertEquals(placed.player.fleet.get("ship-1")?.getHits(), 0);
});

Deno.test("playerReceiveAttack - reports a sunk ship", () => {
  const player = createPlayer("player-1", "real");
  const placed = placePlayerShip(player, createShip("ship-1", "patrolBoat"), {
    coordinates: { row: 0, col: 0 },
    orientation: "vertical",
  });

  assert(placed.success);

  const firstHit = playerReceiveAttack(placed.player, { row: 0, col: 0 });

  assert(firstHit.outcome.type === "hit");
  assertEquals(firstHit.outcome.sunk, false);

  const secondHit = playerReceiveAttack(firstHit.player, { row: 1, col: 0 });

  assert(secondHit.outcome.type === "hit");
  assertEquals(secondHit.outcome.sunk, true);
  assertEquals(secondHit.player.fleet.get("ship-1")?.isSunk(), true);
});

Deno.test("playerReceiveAttack - rejects an already attacked cell", () => {
  const player = createPlayer("player-1", "real");
  const placed = placePlayerShip(player, createShip("ship-1", "patrolBoat"), {
    coordinates: { row: 0, col: 0 },
    orientation: "vertical",
  });

  assert(placed.success);

  const firstHit = playerReceiveAttack(placed.player, { row: 0, col: 0 });

  assert(firstHit.outcome.type === "hit");

  const secondHit = playerReceiveAttack(firstHit.player, { row: 0, col: 0 });

  assertEquals(secondHit.outcome.type, "already-attacked");
  assertStrictEquals(secondHit.player, firstHit.player);
  assertEquals(secondHit.player.fleet.get("ship-1")?.getHits(), 1);
});

Deno.test("playerReceiveAttack - rejects invalid coordinates", () => {
  const player = createPlayer("player-1", "real");

  const invalidCoordinates = [
    { row: -1, col: 0 },
    { row: 10, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 10 },
  ];

  for (const coordinates of invalidCoordinates) {
    const result = playerReceiveAttack(player, coordinates);

    assertEquals(result.outcome.type, "invalid");
    assertStrictEquals(result.player, player);
  }

  assertEquals(player.board.cells[0][0].attacked, false);
});

Deno.test("playerReceiveAttack - throws when board and fleet are out of sync", () => {
  const board = placeShip(2, "ship-1", createBoard(), {
    coordinates: { row: 0, col: 0 },
    orientation: "vertical",
  });

  assert(board !== null);

  const inconsistentPlayer: Player = {
    ...createPlayer("player-1", "real"),
    board,
    // Fleet is empty even though the board contains a ship.
  };

  assertThrows(
    () => playerReceiveAttack(inconsistentPlayer, { row: 0, col: 0 }),
    Error,
  );
});
