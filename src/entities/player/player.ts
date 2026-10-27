import {
  type Board,
  type Coordinates,
  createBoard,
  placeShip,
  type Position,
  receiveAttack,
} from "../board/board.ts";
import {
  addShip,
  allShipsSunk,
  createFleet,
  type Fleet,
  hitShip,
} from "../fleet/fleet.ts";
import { type Ship } from "../ship/ship.ts";

type PlayerType = "real" | "computer";

export type Player = {
  id: string;
  type: PlayerType;
  board: Board;
  fleet: Fleet;
};

export function createPlayer(id: string, type: PlayerType): Player {
  return {
    id,
    type,
    fleet: createFleet(),
    board: createBoard(),
  };
}

export function playerReceiveAttack(
  player: Player,
  coordinates: Coordinates,
) {
  const attack = receiveAttack(player.board, coordinates);

  if (attack === null) {
    return {
      player,
      outcome: { type: "invalid" },
    };
  }

  if (attack.type === "already-attacked") {
    return {
      player,
      outcome: { type: "already-attacked" },
    };
  }

  if (attack.type === "miss") {
    return {
      player: {
        ...player,
        board: attack.board,
      },
      outcome: { type: "miss" },
    };
  }

  const hit = hitShip(player.fleet, attack.shipId);

  if (!hit.success) {
    // The board says a ship was hit, but the fleet cannot register it.
    // That means the board and fleet are out of sync.
    throw new Error(`Inconsistent player state: ${hit.message}`);
  }

  const damagedShip = hit.fleet.get(attack.shipId);

  return {
    player: {
      ...player,
      board: attack.board,
      fleet: hit.fleet,
    },
    outcome: {
      type: "hit",
      shipId: attack.shipId,
      sunk: damagedShip?.isSunk() ?? false,
    },
  };
}
export function placePlayerShip(
  player: Player,
  ship: Ship,
  position: Position,
) {
  const fleetResult = addShip(player.fleet, ship);

  if (!fleetResult.success) {
    return {
      success: false,
      player,
      message: fleetResult.message,
    };
  }

  const nextBoard = placeShip(
    ship.getLength(),
    ship.getShipId(),
    player.board,
    position,
  );

  if (nextBoard === null) {
    return {
      success: false,
      player,
      message: "Invalid ship position",
    };
  }

  return {
    success: true,
    player: {
      ...player,
      board: nextBoard,
      fleet: fleetResult.fleet,
    },
    message: "Ship placed successfully!",
  };
}

export function hasLost(player: Player) {
  return allShipsSunk(player.fleet);
}
