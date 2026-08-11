type Cells = {
  shipId: null | string;
  attacked: boolean;
};

type Board = {
  cells: Cells[][];
};

type Orientation = "vertical" | "horizontal";

type Position = {
  orientation: Orientation;
  coordinates: {
    col: number;
    row: number;
  };
};

export function createBoard(rows = 10, cols = 10): Board {
  return {
    cells: Array.from(
      { length: rows },
      () =>
        Array.from({ length: cols }, () => ({ shipId: null, attacked: false })),
    ),
  };
}

function getVerticalPositions(
  shipLength: number,
  row: number,
  col: number,
  accumulator = 0,
): [number, number][] {
  if (shipLength === 0) return [];

  return [
    [row + accumulator, col],
    ...getVerticalPositions(shipLength - 1, row, col, accumulator + 1),
  ];
}

function getHorizontalPositions(
  shipLength: number,
  row: number,
  col: number,
  accumulator = 0,
): [number, number][] {
  if (shipLength === 0) return [];
  return [
    [row, col + accumulator],
    ...getHorizontalPositions(shipLength - 1, row, col, accumulator + 1),
  ];
}

export function getShipPositions(shipLength: number, position: Position) {
  const { orientation, coordinates } = position;

  const { row, col } = coordinates;

  if (orientation === "vertical") {
    return getVerticalPositions(shipLength, row, col);
  }

  return getHorizontalPositions(shipLength, row, col);
}

export function placeShip(
  shipLength: number,
  shipSymbol: string,
  board: Board,
  position: Position,
) {
  const shipPositions = getShipPositions(shipLength, position);

  const canPlaceShip = shipPositions.every(
    ([row, col]) => {
      const boardRow = board.cells[row];

      if (boardRow === undefined) return false;

      const boardCol = boardRow[col];

      if (boardCol === undefined) return false;

      return boardCol.shipId === null;
    },
  );

  if (!canPlaceShip) return null;

  const newCells = shipPositions.reduce(
    (currentBoard, [row, col]) => {
      const updateRow = [...currentBoard[row]];

      updateRow[col] = { attacked: false, shipId: shipSymbol };

      const nextBoard = [...currentBoard];

      nextBoard[row] = updateRow;

      return nextBoard;
    },
    board.cells,
  );

  return { cells: newCells };
}
