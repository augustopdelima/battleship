# Battleship Implementation Guide

A step-by-step guide for the remaining Battleship features, written to fit what already exists in this repo (Ship, Board, and Fleet) and updated with the decisions made so far.

I'm assuming "Gameboard" means the existing Board module. You do not need to rename it unless you want to.

## Contents

1. [Before you start](#before-you-start-three-decisions)
2. [Step 1: Player module](#step-1-player-module)
3. [Step 2: Game module & turn tracking](#step-2-game-module--turn-tracking)
4. [Step 3: Render model and board renderer](#step-3-render-model-and-board-renderer)
5. [Step 4: DOM controller and event listeners](#step-4-dom-controller-and-event-listeners)
6. [Step 5: End-game behaviour](#step-5-end-game-behaviour)
7. [Step 6: Predetermined placement](#step-6-predetermined-placement)
8. [Step 7: Ship placement system](#step-7-ship-placement-system)
9. [Step 8: Full integration and manual checks](#step-8-full-integration-and-manual-checks)
10. [Suggested file layout](#suggested-file-layout)
11. [Testing order and habits](#testing-order-and-habits)

---

## Before you start: three decisions

### 1. Decide how state changes

The current Ship, Board, and Fleet are immutable: every action returns a new value. Stay consistent with that. Player and Game should also return new state instead of mutating objects. It makes tests simple and prevents the UI from accidentally sharing state.

### 2. Separate rules from the DOM

Keep three layers:

- **Domain/Entities:** `Ship`, `Board`, `Fleet`, `Player`. No DOM, no I/O.
- **Application/Game:** `Game` and `AI`. Orchestrates turns, win conditions and move selection. No DOM.
- **Rendering/UI:** turns state into DOM. No game rules.
- **Controller:** listens to clicks, calls Game/AI, re-renders. Holds current game state and coordinates flow.

If you follow that split, almost every feature can be tested without a browser.

### 3. Test each step before moving on

For every step below: write the failing test first, implement the minimum, run the whole suite, then refactor. Add a test task to `deno.json` if you do not have one, and run tests with coverage regularly.

---

## Step 1: Player module

**Goal:** A `Player` composes its own `Board` and `Fleet` and keeps them consistent during placement and attacks.

### What was done

- **Factory:** `createPlayer(id: string, type: PlayerType)` where `PlayerType = "real" | "computer"`. Each player gets an independent `createBoard()` and `createFleet()`.
- **Types:** Export `Player`, `PlayerType`, `Board`, `Fleet`, `Position`, `Coordinates` from their modules to allow composition.
- **Placement:** `placePlayerShip(player, ship, position): PlacePlayerShipResult` is atomic. Add the ship to the fleet first via `addShip`, then place it on the board via `placeShip` passing the **ship ID** as the `shipSymbol`. Only commit if both succeed. On failure, return the original `player` unchanged.
- **Attack resolution:** `playerReceiveAttack(player, coordinates): PlayerAttackResult`. Uses `receiveAttack` on the board. If it's a `hit`, calls `hitShip` on the fleet with the returned ship ID. If board and fleet become out of sync, throws an error. 
- **Helpers:** `hasLost(player)` delegates to `allShipsSunk(player.fleet)`.
- **Result types:** `AttackOutcome` is a discriminated union (`hit` with `shipId` and `sunk`, `miss`, `already-attacked`, `invalid`). `PlayerAttackResult` returns `{ player, outcome }`. `PlacePlayerShipResult` keeps `{ success, player, message }` for now.

### Tests

- Player creation for real and computer types (separate boards/fleets)
- Atomic placement, immutability on success and failure
- Rejections: out of bounds, overlap, duplicate ship ID, fleet limit
- Attack outcomes: hit/miss, sunk detection, already-attacked, invalid coordinates
- Board and fleet inconsistency throws
- Fleet/board ID consistency for hits

**Done when:** All player tests pass and the module has no DOM/IO.

---

## Step 2: Game module & turn tracking

**Goal:** A pure, immutable orchestrator that works for both Player vs Computer and Player vs Player. The Game must not know about UI or whether a player is human/computer.

### File layout

Create `src/game/` with:
- `game.ts` - Game state, turn logic
- `game_test.ts`
- `ai.ts` - Pure computer move selection
- `ai_test.ts`

### GameState

Use enums/identifiers for clarity and `readonly` for immutability:

```ts
import { type Player } from "../entities/player/player.ts";

export enum PlayerId {
  P1 = "p1",
  P2 = "p2",
}

export enum GamePhase {
  PLACEMENT = "placement",
  PLAYING = "playing",
  OVER = "over",
}

export type GameState = {
  readonly p1: Player;
  readonly p2: Player;
  readonly turn: PlayerId;
  readonly winner: PlayerId | null;
  readonly phase: GamePhase;
};
```

Notes:
- `p1` and `p2` can both be `real` or `computer`. Do not add a `mode` field.
- Determine "human vs computer" by checking `state.p1.type` / `state.p2.type` in the controller, not in the Game module.

### AI (separate, pure)

Put in `src/game/ai.ts`:

- `chooseComputerAttack(enemyBoard: Board, random: RandomFn = Math.random): Coordinates | null`
- Collect all in-bounds cells where `attacked === false`
- Pick one with the injected `random` function
- Return `null` if no legal moves exist
- Must not inspect `shipId` or mutate anything

### Game logic (generic)

In `game.ts`:

- `createGame(p1: Player, p2: Player): GameState` - sets `turn` to `PlayerId.P1`, `phase` to `GamePhase.PLACEMENT`, `winner` to `null`
- `startGame(state: GameState): GameState` - transitions `PLACEMENT` -> `PLAYING` (only if in placement)
- `playAttack(state: GameState, coords: Coordinates): GameTurnResult` - **single generic function for both PvP and PvC**

`GameTurnResult` should be a discriminated union, e.g.:

```ts
export type GameTurnResult =
  | { type: "continue"; state: GameState; outcome: AttackOutcome }
  | { type: "game-over"; state: GameState; outcome: AttackOutcome }
  | { type: "invalid-move"; state: GameState; outcome: AttackOutcome };
```

Rules for `playAttack`:

1. Guard: if `phase !== "PLAYING"` return `invalid-move`.
2. Get `attackerId` from `state.turn`, derive `defenderId` as the opponent.
3. Call `playerReceiveAttack(defender, coords)`.
4. If `outcome` is `invalid` or `already-attacked`: return `invalid-move` with the possibly updated defender state (board unchanged in practice) but **do not switch `turn`**.
5. If valid (`hit` or `miss`): let `newDefender` be the updated player. Check `hasLost(newDefender)`. If lost, return `game-over` with `phase: GamePhase.OVER`, `winner: attackerId`. If not lost, update `newDefender` in state and switch `turn` to `defenderId`, return `continue`.

**Important:** The Game module must never check `player.type`. All "human vs computer" decisions belong to the controller.

### Controller decides

In the UI/controller layer:

- Determine `attacker` from `state.turn`. Get `defenderId` and `defenderBoard`.
- If `attacker.type === "computer"`: call `chooseComputerAttack(defenderBoard, random)`, if `null` handle gracefully, else call `playAttack(state, coords)`. Re-render and if game not over and next is computer, repeat as needed.
- If `attacker.type === "real"`: wait for a click on the enemy board, decode coordinates, call `playAttack(state, coords)`. Re-render and let the next step run (which may auto-play if next is computer).
- For PvP (both real), it will always wait for clicks and alternate via `playAttack` alone.

### Tests to write

- **AI:** legal moves only, no repeats by construction, deterministic with seeded random, returns `null` when exhausted, doesn't mutate board.
- **Game:** PvP turn alternation, PvC flow using computer, invalid/already-attacked do not switch turns, win on sinking last ship, game over prevents further moves, state is immutable.
- **Integration:** Simulate full game to completion headlessly.

**Done when:** You can run a full PvP or PvC game in tests with no DOM and no timers.

---

## Step 3: Render model and board renderer

**Goal:** Display both boards from game state.

Split into pure view model + thin DOM writer.

### What to build

- **View model:** For each cell return state: `empty`, `ship`, `hit`, `miss`, or `hidden`. 
- **Options:** `revealShips` (player's own board), `hideShips` (enemy board), optionally mark sunk ships.
- **Renderer:** Build/update a 10x10 grid. Put `data-row` and `data-col` on each cell. Use buttons or accessible elements with keyboard support.
- **Status area:** Show current turn, last outcome, winner.
- **Both boards visible:** Player's board and opponent's board at the same time.

### Rules

- Enemy board must **never** reveal un-attacked ship cells.
- Renderer receives state, does not decide legality.
- Use CSS classes, not inline styles.
- Re-render by updating existing elements, avoid duplicating listeners (use event delegation).
- Keep coordinates in data attributes.

### Tests

- Grid structure (10x10), correct data attributes
- Own board shows ships, enemy hides them
- Hit/miss render correctly
- Re-render updates cells without duplicates
- Status shows turn and winner
- Prefer testing the pure view model first

**Done when:** Can render arbitrary `GameState` and assert on cell states.

---

## Step 4: DOM controller and event listeners

**Goal:** Wire clicks to game actions and keep UI in sync.

### What to build

- Controller owns current `GameState`, `busy` flag, board containers, status element
- Inject scheduler/delay for computer turns (use a function like `(fn) => fn()` in tests)
- Event delegation on enemy board container
- On human click:
  - Ignore if game over, not player's turn, or computer is busy
  - Decode coords from clicked cell
  - Call `playAttack`
  - Re-render boards + status
  - If not over and next player is computer, schedule/run computer turn via AI + `playAttack`, re-render again
- Restart button resets to fresh game

### Rules

- Controller coordinates only, no rule logic (no hit/sink/win calculations)
- Use the same `playAttack` for both human and computer moves
- Prevent double-clicks during computer's turn
- Only allow attacks on opponent board for real players
- Use event delegation, not 100 listeners per render

### Tests

- Clicking calls `playAttack` with correct coords
- Clicking own board does nothing
- Invalid/already-attacked don't consume turn
- Computer move scheduled after human move
- Computer doesn't move after human wins
- Double-click protection
- Restart resets state/UI
- Controller never calls Board/Fleet/Player attack functions directly

**Done when:** Can simulate clicks in a test DOM with a fake scheduler and play full games.

---

## Step 5: End-game behaviour

**Goal:** Clear end state and prevent further play.

### What to build

- Winner message ("You win" / "Computer wins")
- Disable or ignore all attack clicks after `phase === "over"`
- Optionally reveal computer's remaining ships at end
- Keep restart button active
- Optionally show summary (hits/misses/sunk)

### Tests

- Game ends at the moment last ship sinks
- Further clicks ignored
- Correct winner displayed
- Restart clears winner and re-enables play
- Game doesn't end on miss/partial sinks

**Done when:** Can play to completion and restart cleanly.

---

## Step 6: Predetermined placement

**Goal:** Set up both fleets with fixed coordinates before implementing free placement.

### What to build

- Placement lists for human and computer (ship type/id/start/orientation)
- Setup function that calls `placePlayerShip` for each
- Fail loudly on invalid placement
- Both fleets populated before moving to `PLAYING`
- Game should not start with empty/incomplete fleets

### Tests

- All ships placed, correct positions, no overlaps, in bounds
- Fleet limits respected
- Invalid placement fails loudly
- Deterministic setup
- Human and computer boards independent

**Done when:** Game starts in a known valid state.

---

## Step 7: Ship placement system

**Goal:** Let the human place ships manually or randomly.

### What to build

- Placement phase in `GameState` (already have `PLACEMENT`)
- UI state: selected ship, orientation (UI only, not game rules)
- Preview of ship cells with valid/invalid styling
- Use `placePlayerShip` for validation/placement
- Random placement helper: try random coords/orientations, validate, bounded retries, use injected random for tests
- "Start game" enabled only when all required ships placed
- Switching to `PLAYING` transitions phase

### Tests

- Manual placement places on board and fleet
- Preview updates correctly
- Invalid placements rejected, state unchanged
- Can't place twice/exceed limits
- Random placement legal and deterministic with injected random
- Start button gating
- Attacks rejected during placement
- Undo/reset if implemented

**Done when:** Can place full fleet manually or randomly and only start when complete.

---

## Step 8: Full integration and manual checks

**Goal:** Prove everything works together.

### Automated

- End-to-end test: place fleets, simulate turns until sunk, assert winner, no repeats, no moves after end

### Manual

- Both boards visible, enemy ships hidden before hit
- Hits/misses visually distinct
- Status updates each move
- Computer doesn't repeat shots
- Computer turn not interruptible by clicks
- Ends at right moment
- Restart works
- Basic keyboard/screen reader labels for grid

---

## Suggested file layout

```
src/
├── entities/
│   ├── board/        (board.ts, board_test.ts)
│   ├── fleet/        (fleet.ts, fleet_test.ts)
│   ├── player/       (player.ts, player_test.ts)
│   └── ship/         (ship.ts, ship_test.ts)
├── game/
│   ├── game.ts       # GameState, createGame, startGame, playAttack
│   ├── game_test.ts
│   ├── ai.ts         # chooseComputerAttack (pure, injected random)
│   └── ai_test.ts
├── ui/
│   ├── render.ts
│   ├── render_test.ts
│   ├── controller.ts
│   ├── controller_test.ts
│   └── placement.ts  # if placement logic grows
└── main.ts           # bootstrap only
```

---

## Testing order and habits

Follow this loop for each step:

1. Write one failing test for the smallest behaviour
2. Implement only enough to pass
3. Run the whole suite, not just the new file
4. Refactor while green
5. Check coverage for the new module
6. Commit feature + tests together

**Rules to keep:**
- Domain/tests free of DOM and real timers
- Inject randomness (`RandomFn`) and schedulers
- Player/Game orchestrate via their own APIs (don't reach into internals)
- Game is generic: no "player vs computer" branching inside Game, only in controller
- Controller coordinates, renderer displays, Game/Player/Board/Fleet decide rules
- Keep everything immutable
- AI is pure and only looks at the enemy board
