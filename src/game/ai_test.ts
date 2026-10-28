import { assert, assertEquals, assertNotEquals } from "@std/assert";
import { chooseComputerAttack } from "./ai.ts";
import { createBoard, placeShip, receiveAttack } from "../entities/board/board.ts";

Deno.test("chooseComputerAttack - returns a legal unattacked coordinate", () => {
  const board = createBoard();
  const coords = chooseComputerAttack(board);

  assertNotEquals(coords, null);
  if (coords === null) return;

  assertEquals(coords.row >= 0 && coords.row < 10, true);
  assertEquals(coords.col >= 0 && coords.col < 10, true);
  assertEquals(board.cells[coords.row][coords.col].attacked, false);
});

Deno.test("chooseComputerAttack - never picks an attacked cell", () => {
  let board = createBoard();
  const placed = placeShip(4, "A", board, {
    coordinates: { row: 0, col: 0 },
    orientation: "horizontal",
  });
  assert(placed !== null);
  board = placed;

  const attack = receiveAttack(board, { row: 0, col: 0 });
  assert(attack !== null);
  board = attack.board;

  for (let i = 0; i < 20; i++) {
    const coords = chooseComputerAttack(board);
    assertNotEquals(coords, null);
    if (coords === null) return;
    assertEquals(board.cells[coords.row][coords.col].attacked, false);
  }
});

Deno.test("chooseComputerAttack - is deterministic with seeded random", () => {
  const board = createBoard();
  const first = chooseComputerAttack(board, () => 0);
  const second = chooseComputerAttack(board, () => 0);

  assertEquals(first, second);
});

Deno.test("chooseComputerAttack - returns null when all cells are attacked", () => {
  let board = createBoard();

  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const attack = receiveAttack(board, { row, col });
      assert(attack !== null);
      board = attack.board;
    }
  }

  const coords = chooseComputerAttack(board);
  assertEquals(coords, null);
});

Deno.test("chooseComputerAttack - does not mutate the board", () => {
  const board = createBoard();
  const before = JSON.stringify(board);
  const coords = chooseComputerAttack(board);
  const after = JSON.stringify(board);

  assertNotEquals(coords, null);
  assertEquals(before, after);
});
