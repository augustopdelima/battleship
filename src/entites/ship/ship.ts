export type ShipType =
  | "patrolBoat"
  | "submarine"
  | "destroyer"
  | "battleship"
  | "aircraftCarrier";

const shipLengths: Record<ShipType, number> = {
  patrolBoat: 2,
  submarine: 3,
  destroyer: 3,
  battleship: 4,
  aircraftCarrier: 5,
};

export type Ship = {
  getType: () => ShipType;
  getLength: () => number;
  hit: () => Ship;
  getHits: () => number;
  isSunk: () => boolean;
};

export function createShip(type: ShipType, hits = 0): Ship {
  const length = shipLengths[type];

  return {
    getType: () => type,
    getLength: () => length,
    getHits: () => hits,
    isSunk: () => hits >= length,
    hit: () => createShip(type, Math.min(hits + 1, length)),
  };
}
