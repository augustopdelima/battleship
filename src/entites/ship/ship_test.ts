import { assertEquals } from "@std/assert";
import { createShip, Ship } from "./ship.ts";
import { assertNotEquals } from "@std/assert/not-equals";

const ships = [
  ["patrolBoat", 2],
  ["submarine", 3],
  ["destroyer", 3],
  ["battleship", 4],
  ["aircraftCarrier", 5],
] as const;

const hitManyTimes = (hits: number, ship: Ship): Ship =>
  hits === 0 ? ship : hitManyTimes(hits - 1, ship.hit());

Deno.test("Should create a battleship with length 4", () => {
  const ship = createShip("ship-001", "battleship");

  assertEquals(ship.getLength(), 4);
});

Deno.test("Should sink after receiving enough hits", () => {
  const ship = createShip("ship-001", "destroyer");

  const newship = hitManyTimes(3, ship);

  assertEquals(newship.isSunk(), true);
});

Deno.test("Should create a battleship", () => {
  const ship = createShip("ship-001", "battleship");

  assertEquals(ship.getType(), "battleship");
});

Deno.test("Should not be sunk when created", () => {
  const ship = createShip("ship-001", "battleship");
  assertEquals(ship.isSunk(), false);
});

Deno.test("Should not be sunk after one hit", () => {
  const ship = createShip("ship-001", "battleship");

  const damagedShip = ship.hit();
  assertEquals(damagedShip.isSunk(), false);
});

Deno.test("Should not sink before receiving enough hits", () => {
  const ship = createShip("ship-001", "battleship");

  const damagedShip = hitManyTimes(3, ship);

  assertEquals(damagedShip.isSunk(), false);
});

Deno.test("Should not mutate the original ship when hit", () => {
  const ship = createShip("ship-001", "battleship");

  const damagedShip = ship.hit();

  assertEquals(ship.getHits(), 0);
  assertEquals(damagedShip.getHits(), 1);
});

Deno.test("Should return a new ship after being hit", () => {
  const ship = createShip("ship-001", "battleship");

  const damagedShip = ship.hit();

  assertNotEquals(ship, damagedShip);
});

Deno.test("Should not register hits after the ship is sunk", () => {
  const ship = createShip("ship-001", "patrolBoat");

  const damagedShip = hitManyTimes(5, ship);
  assertEquals(damagedShip.getHits(), 2);
});

ships.forEach(([type, expectedLength]) => {
  Deno.test(`Should create a ${type} with length ${expectedLength}`, () => {
    const ship = createShip("ship-001", type);

    assertEquals(ship.getLength(), expectedLength);
  });
});
