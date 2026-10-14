import { Ship, ShipType } from "../ship/ship.ts";

type Fleet = Map<string, Ship>;

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

function hasReachedLimited(fleetLimit: ShipLimits) {
  return (shipType: ShipType, shipsAdded: ShipLimits) => {
    const amountOfShipsAdded = shipsAdded[shipType];
    const limit = fleetLimit[shipType];

    return amountOfShipsAdded >= limit;
  };
}

const checkLimit = hasReachedLimited(FleetLimit);

export function getShip(fleet: Fleet, shipId: string): Ship | undefined {
  return fleet.get(shipId);
}

export function addShip(fleet: Fleet, ship: Ship, shipsAdded: ShipLimits) {
  const shipId = ship.getShipId();

  if (fleet.has(shipId)) {
    return {
      message: "This ship has already been added",
      success: false,
      fleet,
      shipsAdded,
    };
  }

  const shipType = ship.getType();

  if (checkLimit(shipType, shipsAdded)) {
    return {
      message: "The limit for this ship type has been reached",
      success: false,
      fleet,
      shipsAdded,
    };
  }

  const newFleet = new Map(
    [...fleet.entries()].map(([key, value]) => [key, structuredClone(value)]),
  );

  newFleet.set(shipId, ship);

  const newAmount = shipsAdded[shipType] + 1;
  const newShipAdded = { ...shipsAdded, [shipType]: newAmount };

  return {
    message: "Ship added successfully",
    success: true,
    fleet: newFleet,
    shipsAdded: newShipAdded,
  };
}

export function hitShip() {
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
