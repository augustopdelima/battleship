import { createShip, type Ship, type ShipType } from "../ship/ship.ts";

export type Fleet = Map<string, Ship>;

type ShipLimits = Record<ShipType, number>;

const FleetLimit: ShipLimits = {
  "aircraftCarrier": 1,
  "battleship": 1,
  "submarine": 2,
  "destroyer": 2,
  "patrolBoat": 2,
};

export function createFleet() {
  return new Map<string, Ship>();
}

function cloneFleet(
  fleet: Fleet,
  transformShip: (ship: Ship) => Ship = cloneShip,
): Fleet {
  return new Map(
    [...fleet.entries()].map(([key, ship]) => [
      key,
      transformShip(ship),
    ]),
  );
}

function hasReachedLimit(fleetLimit: ShipLimits) {
  return (shipType: ShipType, amountOfShips: number) => {
    return amountOfShips >= fleetLimit[shipType];
  };
}

const checkLimit = hasReachedLimit(FleetLimit);

export function getShip(fleet: Fleet, shipId: string): Ship | undefined {
  return fleet.get(shipId);
}

function cloneShip(ship: Ship): Ship {
  return createShip(
    ship.getShipId(),
    ship.getType(),
    ship.getHits(),
  );
}

export function addShip(fleet: Fleet, ship: Ship) {
  const shipId = ship.getShipId();

  if (fleet.has(shipId)) {
    return {
      message: "This ship has already been added",
      success: false,
      fleet,
    };
  }

  const shipType = ship.getType();

  const amountOfShips = [...fleet.values()].filter(
    (currentShip) => currentShip.getType() === shipType,
  ).length;

  if (checkLimit(shipType, amountOfShips)) {
    return {
      message: "The limit for this ship type has been reached",
      success: false,
      fleet,
    };
  }

  const newFleet = cloneFleet(fleet);
  newFleet.set(shipId, ship);

  return {
    message: "Ship added successfully",
    success: true,
    fleet: newFleet,
  };
}

export function hitShip(fleet: Fleet, shipId: string) {
  const ship = fleet.get(shipId);

  if (fleet.size === 0) {
    return {
      fleet,
      success: false,
      message: "Cannot hit a ship: the fleet is empty.",
    };
  }

  if (!ship) {
    return {
      fleet,
      success: false,
      message: "Cannot hit a ship: ship not found",
    };
  }

  if (ship.isSunk()) {
    return {
      fleet,
      success: false,
      message: "Cannot hit a ship: the ship has already sunk.",
    };
  }

  const newFleet = cloneFleet(
    fleet,
    (currentShip) =>
      currentShip.getShipId() === shipId
        ? currentShip.hit()
        : cloneShip(currentShip),
  );

  return {
    fleet: newFleet,
    success: true,
    message: "Ship hit successfully",
  };
}

export function allShipsSunk(fleet: Fleet) {
  return fleet.size > 0 && [...fleet.values()].every((ship) => ship.isSunk());
}

/*
- Criar o tipo Fleet como Map<string, Ship>. (pronto)

- Criar createFleet(). (pronto)

- Criar addShip(fleet, ship). (pronto)

- Validar se o shipId já existe antes de adicionar. (pronto)

- Definir os limites de cada ShipType: (pronto)
|-> patrolBoat 2
|-> submarine 2
|-> destroyer 2
|-> battleship 1
|-> aircraftCarrier 1

- Criar validação para a quantidade máxima de cada tipo. (pronto)

- Fazer addShip rejeitar um navio quando o limite for atingido. (pronto)

- Criar getShip(fleet, shipId). (pronto)

- Criar hitShip(fleet, shipId).

- Garantir que hitShip não modifica o Fleet original.

- Criar allShipsSunk(fleet).

- Criar testes para:

|- Adicionar navio.
|- Buscar navio.
|- Não permitir ID duplicado.
|- Não permitir quantidade acima do limite.
|- Registrar hit.
|- Garantir imutabilidade do Fleet.
|- Detectar navio afundado.
|- Detectar quando todos os navios estão afundados.
*/
