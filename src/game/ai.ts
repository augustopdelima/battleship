import { type Board } from "../entities/board/board.ts";
import { type Coordinates } from "../entities/board/board.ts";

export type RandomFn = () => number;

export function chooseComputerAttack(
  enemyBoard: Board,
  random: RandomFn = Math.random,
): Coordinates | null {
  const legal: Coordinates[] = enemyBoard.cells.flatMap((row, rowIndex) =>
    row.flatMap((cell, colIndex) =>
      cell.attacked ? [] : [{ row: rowIndex, col: colIndex }],
    ),
  );

  if (legal.length === 0) return null;

  const index = Math.floor(random() * legal.length);
  return legal[index];
}
