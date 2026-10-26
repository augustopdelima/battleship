import {
  type Board,
  createBoard,
  placeShip,
  type Position,
} from "../board/board.ts";
import { addShip, createFleet, type Fleet } from "../fleet/fleet.ts";
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
