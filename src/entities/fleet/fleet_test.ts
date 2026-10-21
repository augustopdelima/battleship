import { assertEquals, assertNotEquals, assertStrictEquals } from "@std/assert";

import {
  addShip,
  allShipsSunk,
  createFleet,
  getShip,
  hitShip,
} from "./fleet.ts";

import { createShip, type Ship, type ShipType } from "../ship/ship.ts";

Deno.test("createFleet - creates an empty fleet", () => {
  const fleet = createFleet();

  assertEquals(fleet.size, 0);
});

Deno.test("createFleet - returns independent fleet instances", () => {
  const fleetA = createFleet();
  const fleetB = createFleet();

  fleetA.set("ship-1", createShip("ship-1", "patrolBoat"));

  assertEquals(fleetA.size, 1);
  assertEquals(fleetB.size, 0);
});

Deno.test("getShip - returns an existing ship", () => {
  const fleet = createFleet();
  const ship = createShip("ship-1", "destroyer");

  fleet.set(ship.getShipId(), ship);

  assertStrictEquals(getShip(fleet, "ship-1"), ship);
});

Deno.test("getShip - returns undefined for an unknown ID", () => {
  const fleet = createFleet();

  assertEquals(getShip(fleet, "unknown-ship"), undefined);
});

Deno.test("addShip - preserves the original fleet", () => {
  const fleet = createFleet();
  const ship = createShip("ship-1", "patrolBoat");

  const result = addShip(fleet, ship);

  assertEquals(fleet.size, 0);
  assertEquals(result.fleet.size, 1);
  assertNotEquals(result.fleet, fleet);
});

Deno.test("addShip - adds a ship to the fleet", () => {
  const fleet = createFleet();
  const ship = createShip("ship-1", "patrolBoat");

  const result = addShip(fleet, ship);

  assertEquals(result.success, true);
  assertEquals(result.message, "Ship added successfully");
  assertEquals(result.fleet.size, 1);
  assertStrictEquals(result.fleet.get("ship-1"), ship);
});

Deno.test("addShip - preserves the original fleet", () => {
  const fleet = createFleet();
  const ship = createShip("ship-1", "patrolBoat");

  const result = addShip(fleet, ship);

  assertEquals(fleet.size, 0);
  assertEquals(result.fleet.size, 1);
  assertNotEquals(result.fleet, fleet);
});

Deno.test("addShip - rejects a duplicate ship ID", () => {
  const ship = createShip("ship-1", "patrolBoat");
  const fleet = new Map<string, Ship>([["ship-1", ship]]);

  const result = addShip(fleet, ship);

  assertEquals(result.success, false);
  assertEquals(result.message, "This ship has already been added");
  assertStrictEquals(result.fleet, fleet);
  assertEquals(result.fleet.size, 1);
});

Deno.test("addShip - allows two submarines", () => {
  const firstShip = createShip("submarine-1", "submarine");
  const secondShip = createShip("submarine-2", "submarine");

  const firstResult = addShip(createFleet(), firstShip);
  const secondResult = addShip(firstResult.fleet, secondShip);

  assertEquals(firstResult.success, true);
  assertEquals(secondResult.success, true);
  assertEquals(secondResult.fleet.size, 2);
});

Deno.test("addShip - rejects a third submarine", () => {
  const firstShip = createShip("submarine-1", "submarine");
  const secondShip = createShip("submarine-2", "submarine");
  const thirdShip = createShip("submarine-3", "submarine");

  const firstResult = addShip(createFleet(), firstShip);
  const secondResult = addShip(firstResult.fleet, secondShip);
  const result = addShip(secondResult.fleet, thirdShip);

  assertEquals(result.success, false);
  assertEquals(
    result.message,
    "The limit for this ship type has been reached",
  );
  assertEquals(result.fleet.size, 2);
  assertEquals(result.fleet.has("submarine-3"), false);
});

Deno.test("addShip - enforces the limit for every ship type", () => {
  const limits: Record<ShipType, number> = {
    patrolBoat: 2,
    submarine: 2,
    destroyer: 2,
    battleship: 1,
    aircraftCarrier: 1,
  };

  for (
    const [shipType, limit] of Object.entries(limits) as [
      ShipType,
      number,
    ][]
  ) {
    let fleet = createFleet();

    for (let i = 0; i < limit; i++) {
      const ship = createShip(`${shipType}-${i}`, shipType);
      const result = addShip(fleet, ship);

      assertEquals(result.success, true);
      fleet = result.fleet;
    }

    const extraShip = createShip(`extra-${shipType}`, shipType);
    const result = addShip(fleet, extraShip);

    assertEquals(
      result.success,
      false,
      `Expected ${shipType} to be rejected at limit ${limit}`,
    );

    assertEquals(result.fleet.size, limit);
    assertEquals(result.fleet.has(`extra-${shipType}`), false);
  }
});

Deno.test("addShip - a limit for one type does not block other types", () => {
  const carrier = createShip("carrier-1", "aircraftCarrier");
  const battleship = createShip("battleship-1", "battleship");

  const firstResult = addShip(createFleet(), carrier);
  const result = addShip(firstResult.fleet, battleship);

  assertEquals(result.success, true);
  assertEquals(result.fleet.size, 2);
  assertEquals(result.fleet.has("carrier-1"), true);
  assertEquals(result.fleet.has("battleship-1"), true);
});

Deno.test("hitShip - registers a hit on an existing ship", () => {
  const ship = createShip("ship-1", "patrolBoat");
  const fleet = new Map<string, Ship>([["ship-1", ship]]);

  const result = hitShip(fleet, "ship-1");

  assertEquals(result.success, true);
  assertEquals(result.fleet.get("ship-1")?.getHits(), 1);
});

Deno.test("hitShip - does not mutate the original fleet", () => {
  const ship = createShip("ship-1", "patrolBoat");
  const fleet = new Map<string, Ship>([["ship-1", ship]]);

  const result = hitShip(fleet, "ship-1");

  assertNotEquals(result.fleet, fleet);

  // The original ship must remain unchanged.
  assertEquals(fleet.get("ship-1")?.getHits(), 0);

  // The updated ship must contain the registered hit.
  assertEquals(result.fleet.get("ship-1")?.getHits(), 1);
});

Deno.test("hitShip - preserves other ships in the fleet", () => {
  const firstShip = createShip("ship-1", "patrolBoat");
  const secondShip = createShip("ship-2", "destroyer");

  const fleet = new Map<string, Ship>([
    ["ship-1", firstShip],
    ["ship-2", secondShip],
  ]);

  const result = hitShip(fleet, "ship-1");

  assertEquals(result.fleet.size, 2);
  assertEquals(result.fleet.get("ship-1")?.getHits(), 1);
  assertEquals(result.fleet.get("ship-2")?.getHits(), 0);

  // Unaffected ships are cloned into the new fleet.
  assertNotEquals(result.fleet.get("ship-2"), secondShip);

  //Unaffected originals ship
  assertEquals(firstShip.getHits(), 0);
  assertEquals(secondShip.getHits(), 0);
});

Deno.test("hitShip - rejects an unknown ship ID", () => {
  const ship = createShip("ship-1", "patrolBoat");
  const fleet = new Map<string, Ship>([["ship-1", ship]]);

  const result = hitShip(fleet, "unknown-ship");

  assertEquals(result.success, false);
  assertStrictEquals(result.fleet, fleet);
  assertEquals(fleet.get("ship-1")?.getHits(), 0);
});

Deno.test("hitShip - sinks a patrol boat after two hits", () => {
  const ship = createShip("ship-1", "patrolBoat");
  const fleet = new Map<string, Ship>([["ship-1", ship]]);

  const firstHit = hitShip(fleet, "ship-1");
  const secondHit = hitShip(firstHit.fleet, "ship-1");

  assertEquals(secondHit.success, true);
  assertEquals(secondHit.fleet.get("ship-1")?.getHits(), 2);
  assertEquals(secondHit.fleet.get("ship-1")?.isSunk(), true);

  // The original fleet must remain unchanged.
  assertEquals(fleet.get("ship-1")?.getHits(), 0);
});

Deno.test("hitShip - rejects additional hits on a sunk ship", () => {
  const sunkShip = createShip("ship-1", "patrolBoat", 2);
  const fleet = new Map<string, Ship>([["ship-1", sunkShip]]);

  const result = hitShip(fleet, "ship-1");

  assertEquals(result.success, false);
  assertEquals(result.fleet.get("ship-1")?.getHits(), 2);
  assertEquals(fleet.get("ship-1")?.getHits(), 2);
});

Deno.test("allShipsSunk - returns false for an empty fleet", () => {
  assertEquals(allShipsSunk(createFleet()), false);
});

Deno.test("allShipsSunk - returns false when a ship is afloat", () => {
  const fleet = new Map<string, Ship>([
    ["ship-1", createShip("ship-1", "patrolBoat", 2)],
    ["ship-2", createShip("ship-2", "destroyer", 2)],
  ]);

  assertEquals(allShipsSunk(fleet), false);
});

Deno.test("allShipsSunk - returns true when every ship is sunk", () => {
  const fleet = new Map<string, Ship>([
    ["ship-1", createShip("ship-1", "patrolBoat", 2)],
    ["ship-2", createShip("ship-2", "destroyer", 3)],
    ["ship-3", createShip("ship-3", "battleship", 4)],
  ]);

  assertEquals(allShipsSunk(fleet), true);
});

Deno.test("allShipsSunk - returns false if only one ship remains afloat", () => {
  const fleet = new Map<string, Ship>([
    ["ship-1", createShip("ship-1", "patrolBoat", 2)],
    ["ship-2", createShip("ship-2", "destroyer", 3)],
    ["ship-3", createShip("ship-3", "battleship", 3)],
  ]);

  assertEquals(allShipsSunk(fleet), false);
});
