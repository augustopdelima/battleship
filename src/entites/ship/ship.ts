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
  getShipId: () => string;
  isSunk: () => boolean;
};

export function createShip(shipId: string, type: ShipType, hits = 0): Ship {
  const length = shipLengths[type];

  return {
    getType: () => type,
    getLength: () => length,
    getHits: () => hits,
    getShipId: () => shipId,
    isSunk: () => hits >= length,
    hit: () => createShip(shipId, type, Math.min(hits + 1, length)),
  };
}
