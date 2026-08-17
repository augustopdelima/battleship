import { assert, assertEquals } from "@std/assert";
import {
  createBoard,
  getShipPositions,
  placeShip,
  receiveAttack,
} from "./board.ts";

Deno.test("Should create a board with rows and cols length equal to 10", () => {
  const board = createBoard();
  const { cells } = board;
  assertEquals(cells.length, 10);

  cells.forEach((col) => {
    assertEquals(col.length, 10);
  });
});

Deno.test("Should return four consecutive vertical positions", () => {
  const expected = [[0, 0], [1, 0], [2, 0], [3, 0]];

  const result = getShipPositions(4, {
    coordinates: { row: 0, col: 0 },
    orientation: "vertical",
  });

  assertEquals(result, expected);
});

Deno.test("Should return four consecutive horizontal positions", () => {
  const expected = [[0, 0], [0, 1], [0, 2], [0, 3]];

  const result = getShipPositions(4, {
    coordinates: { row: 0, col: 0 },
    orientation: "horizontal",
  });

  assertEquals(result, expected);
});

Deno.test("should place a ship vertically", () => {
  const board = createBoard();
  const expected = [[0, 0], [1, 0], [2, 0], [3, 0]];
  const shipSymbol = "A";

  const newBoard = placeShip(4, shipSymbol, board, {
    coordinates: { row: 0, col: 0 },
    orientation: "vertical",
  });

  assert(newBoard !== null);

  expected.forEach(([row, col]) => {
    const result = newBoard.cells[row][col];

    assertEquals(result, { attacked: false, shipId: shipSymbol });
  });
});

Deno.test("should place a ship horizontally", () => {
  const expected = [[0, 0], [0, 1], [0, 2], [0, 3]];
  const board = createBoard();
  const shipSymbol = "B";
  const newBoard = placeShip(4, shipSymbol, board, {
    coordinates: { row: 0, col: 0 },
    orientation: "horizontal",
  });

  assert(newBoard !== null);

  expected.forEach(([row, col]) => {
    const result = newBoard.cells[row][col];

    assertEquals(result, { attacked: false, shipId: shipSymbol });
  });
});

Deno.test("should not place a ship outside the board", () => {
  const board = createBoard();

  const newBoard = placeShip(4, "C", board, {
    coordinates: { row: 9, col: 0 },
    orientation: "vertical",
  });

  assert(newBoard === null);
});

Deno.test("should not place a ship over another ship", () => {
  const board = createBoard();
  const shipSymbol = "A";

  const newBoard = placeShip(4, shipSymbol, board, {
    coordinates: { row: 0, col: 0 },
    orientation: "vertical",
  });

  assert(newBoard !== null);

  const secondShipSymbol = "B";

  const secondBoard = placeShip(2, secondShipSymbol, newBoard, {
    coordinates: { row: 3, col: 0 },
    orientation: "vertical",
  });

  assert(secondBoard === null);
});

Deno.test("should not place a horizontal ship outside the board", () => {
  const board = createBoard();

  const newBoard = placeShip(4, "C", board, {
    coordinates: { row: 0, col: 8 },
    orientation: "horizontal",
  });

  assert(newBoard === null);
});

Deno.test("should not modify the board when ship placement fails", () => {
  const board = createBoard();

  const newBoard = placeShip(4, "A", board, {
    coordinates: { row: 9, col: 0 },
    orientation: "vertical",
  });

  assert(newBoard === null);

  board.cells.forEach((row) => {
    row.forEach((cell) => {
      assertEquals(cell, { attacked: false, shipId: null });
    });
  });
});

Deno.test("should place two ships without overlapping", () => {
  const board = createBoard();

  const boardWithFirstShip = placeShip(4, "A", board, {
    coordinates: { row: 0, col: 0 },
    orientation: "vertical",
  });

  assert(boardWithFirstShip !== null);

  const boardWithSecondShip = placeShip(3, "B", boardWithFirstShip, {
    coordinates: { row: 0, col: 2 },
    orientation: "horizontal",
  });

  assert(boardWithSecondShip !== null);

  assertEquals(boardWithSecondShip.cells[0][0].shipId, "A");
  assertEquals(boardWithSecondShip.cells[1][0].shipId, "A");
  assertEquals(boardWithSecondShip.cells[2][0].shipId, "A");
  assertEquals(boardWithSecondShip.cells[3][0].shipId, "A");

  assertEquals(boardWithSecondShip.cells[0][2].shipId, "B");
  assertEquals(boardWithSecondShip.cells[0][3].shipId, "B");
  assertEquals(boardWithSecondShip.cells[0][4].shipId, "B");
});

Deno.test("should return one position for a ship with length one", () => {
  const result = getShipPositions(1, {
    coordinates: { row: 3, col: 5 },
    orientation: "vertical",
  });

  assertEquals(result, [[3, 5]]);
});

Deno.test("should return positions starting from given coordinates", () => {
  const result = getShipPositions(3, {
    coordinates: { row: 4, col: 5 },
    orientation: "horizontal",
  });

  assertEquals(result, [[4, 5], [4, 6], [4, 7]]);
});

Deno.test("should return a miss when attacking an empty cell", () => {
  const board = createBoard();
  const result = placeShip(4, "A", board, {
    coordinates: { row: 0, col: 0 },
    orientation: "horizontal",
  });

  assert(result !== null);

  const attackMiss = receiveAttack(result, { row: 1, col: 1 });

  assert(attackMiss !== null);
  assert(attackMiss.type === "miss");

  const cell = attackMiss.board.cells[1][1];

  assert(cell.attacked === true);
  assert(cell.shipId === null);
});

Deno.test("should not alter other cells when attacking an empty cell", () => {
  const board = createBoard();
  const result = receiveAttack(board, { row: 1, col: 1 });

  assert(result !== null);
  assert(result.type === "miss");

  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (row === 1 && col === 1) continue;

      assert(result.board.cells[row][col].attacked === false);
    }
  }
});

Deno.test("should return a hit when attacking a ship", () => {
  const board = createBoard();
  const result = placeShip(4, "A", board, {
    coordinates: { row: 0, col: 0 },
    orientation: "horizontal",
  });

  assert(result !== null);

  const attackHit = receiveAttack(result, { row: 0, col: 0 });

  assert(attackHit !== null);
  assert(attackHit.type === "hit");

  const cell = attackHit.board.cells[0][0];

  assert(cell.attacked === true);
  assert(cell.shipId !== null);
});

Deno.test("should return a hit when attacking each ship part", () => {
  const board = createBoard();
  let result = placeShip(4, "A", board, {
    coordinates: { row: 0, col: 0 },
    orientation: "horizontal",
  });

  const attacks = [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
    { row: 0, col: 3 },
  ];

  attacks.forEach(({ row, col }) => {
    assert(result !== null);
    const attackHit = receiveAttack(result, { row, col });

    assert(attackHit !== null);
    assert(attackHit.type === "hit");

    result = attackHit.board;

    const cell = result.cells[row][col];

    assert(cell.attacked === true);
    assert(cell.shipId === "A");
  });
});

Deno.test("should reject an attack on an already attacked position", () => {
  const board = createBoard();
  const result = placeShip(4, "A", board, {
    coordinates: { row: 0, col: 0 },
    orientation: "horizontal",
  });

  assert(result !== null);

  const attackHit = receiveAttack(result, { row: 0, col: 0 });

  assert(attackHit !== null);

  const secondAttack = receiveAttack(attackHit.board, { row: 0, col: 0 });

  assert(secondAttack !== null);

  assert(secondAttack.type === "already-attacked");

  assert(secondAttack.board === attackHit.board);
});

Deno.test("should reject an attack on an invalid position", () => {
  const board = createBoard();

  const invalidPositions = [
    { row: -1, col: 0 },
    { row: 10, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 10 },
  ];

  for (const position of invalidPositions) {
    const result = receiveAttack(board, position);

    assert(result === null);
  }
});
