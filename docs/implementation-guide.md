# Battleship Implementation Guide

A step-by-step guide for the remaining Battleship features, written to fit what
already exists in this repo (Ship, Board, and Fleet) and organized so each
feature is testable on its own.

I'm assuming "Gameboard" means the existing Board module. You do not need to
rename it unless you want to.

## Contents

1. [Before you start](#before-you-start-three-decisions)
2. [Player factory](#step-1-player-factory)
3. [Headless Game and turn module](#step-2-headless-game-and-turn-module)
4. [Render model and board renderer](#step-3-render-model-and-board-renderer)
5. [DOM controller and event listeners](#step-4-dom-controller-and-event-listeners)
6. [End-game behaviour](#step-5-end-game-behaviour)
7. [Predetermined placement](#step-6-predetermined-placement)
8. [Ship placement system](#step-7-ship-placement-system)
9. [Full integration and manual checks](#step-8-full-integration-and-manual-checks)
10. [Suggested file layout](#suggested-file-layout)
11. [Testing order and habits](#testing-order-and-habits)

---

## Before you start: three decisions

### 1. Decide how state changes

The current Ship, Board, and Fleet are immutable: every action returns a new
value. Stay consistent with that. Player and Game should also return new state
instead of mutating objects. It makes tests simple and prevents the UI from
accidentally sharing state.

### 2. Separate rules from the DOM

Keep three layers:

- **Domain:** Ship, Board, Fleet, Player, Game. No DOM.
- **Rendering:** turns state into DOM. No game rules.
- **Controller:** listens to clicks, calls Game, re-renders. Holds the current
  game state and the "busy" flag.

If you follow that split, almost every feature can be tested without a browser.

### 3. Test each step before moving on

For every step below: write the failing test first, implement the minimum, run
the whole suite, then refactor. Add a test task to `deno.json` if you do not
have one, and run tests with coverage regularly.

---

## Step 1: Player factory

**Goal:** A player owns a board, a fleet, and a type: real or computer.

### What to build

- A `createPlayer` function or class with:
  - an ID or name
  - a type: real or computer
  - its own Board instance
  - its own Fleet instance
- Two ways to create players: `createRealPlayer` and `createComputerPlayer`, or
  one factory that accepts the type.
- A way to place a ship on the player's board and add it to the player's fleet
  as one atomic action.
- A way for a player to attack another player:
  - validate the coordinates
  - call the defender's board attack method
  - if the result is a hit, call the fleet's hit method using the returned ship
    ID
  - return the updated defender plus the result: hit, miss, already attacked, or
    invalid
- A way for the computer player to choose an attack:
  - enumerate all in-bounds cells that have not been attacked
  - choose one at random
  - never choose the same cell twice
  - return "no move available" if the board is exhausted

Important design points:

- Do not put turn logic inside Player. Turn order belongs to Game.
- Do not let Player reach into the fleet's internal map directly. Use Fleet's
  functions.
- Placement must be all-or-nothing. Check board placement and fleet limits
  before committing; otherwise you can end up with a ship on the board that is
  not in the fleet, or the reverse.
- Inject the random number generator into the computer's attack chooser. This
  lets tests be deterministic without sleeping or retrying.

### Tests for this feature

- Two players created separately do not share a board or a fleet.
- A real player and a computer player both have a board and a fleet.
- A player's board starts empty.
- Attack on an empty cell returns a miss and marks that cell attacked.
- Attack on a ship cell returns a hit and increments that ship's hit count in the
  defender's fleet.
- Attack does not mutate the original defender state.
- Attack on an already attacked cell returns "already attacked" and changes
  nothing.
- Attack outside the board returns invalid or null and changes nothing.
- Placing a valid ship updates both the board and the fleet.
- Placing a ship twice, overlapping a ship, or exceeding the fleet limit fails
  and leaves both board and fleet unchanged.
- Computer chooses only in-bounds, unattacked cells.
- With a fixed random generator, the computer's choice is predictable.
- Repeated computer choices never repeat a cell.
- When every cell has been attacked, the computer has no legal move.
- Computer does not mutate the enemy board just by choosing a move.

**Done when:** Player tests pass without any DOM code.

---

## Step 2: Headless Game and turn module

**Goal:** A module that owns the game state and steps through turns. This must
work with no HTML at all.

### What to build

- `createGame` with a human player and a computer player.
- Game state should include:
  - both players
  - whose turn it is
  - game status: placing, playing, or over
  - winner, if any
  - the last event: hit, miss, already attacked, invalid, or sunk
- A `playTurn` function that:
  - rejects moves when the game is over
  - rejects moves from the wrong player
  - rejects moves during the placement phase
  - applies the human attack
  - checks whether the computer's fleet is entirely sunk
  - ends the game or switches to the computer's turn
  - returns a new game state plus the event
- A `computerTurn` function that:
  - asks the computer player for a legal move
  - applies it through the same `playTurn` path
  - switches back to the human, unless the game ended
- A `restart` or `reset` function that creates a fresh game.

Important design points:

- The controller should never call Board or Fleet directly. It should only call
  Game.
- The computer's move must go through the same validation as the human's move.
  Do not create a second attack path.
- Determine "sunk" after the hit, using the fleet's existing `allShipsSunk`
  function.
- Guard the empty-fleet case. `allShipsSunk` returns false for an empty fleet,
  so make sure the game is not considered started until ships exist.
- Keep re-rendering out of this module.

### Tests for this feature

- A new game starts in the placement phase or playing phase, depending on your
  design.
- The human moves first.
- A valid human attack changes the computer's board.
- A hit updates the computer's fleet.
- A miss leaves the fleet unchanged.
- An invalid or already-attacked move does not switch turns.
- A valid move switches to the computer.
- The computer only plays after the human.
- The computer never shoots the same cell twice across many turns.
- The game ends exactly when every ship in one fleet is sunk.
- The correct winner is reported.
- No further turns are accepted after the game ends.
- The computer does not get a turn after the human wins.
- Restart produces a completely fresh game with empty boards and full fleets.
- The original game state is not mutated by any turn.

**Done when:** You can simulate an entire game in tests with no browser and no
timers.

---

## Step 3: Render model and board renderer

**Goal:** Display both boards from game state.

Split this into two pieces so most of it is easy to test:

1. A pure "view model" function: given a board and options, return a grid of
   cell descriptions.
2. A thin DOM writer: take the view model and create or update DOM elements.

### What to build

- A view model for each cell with a state such as empty, ship, hit, miss, or
  hidden.
- Options for the renderer:
  - reveal ships, used for the player's own board
  - hide ships until attacked, used for the enemy board
  - optionally mark sunk ships
- A `renderBoard` function that builds a 10 by 10 grid.
- Each cell should carry data attributes for row and column so clicks can be
  decoded without guessing.
- Each cell should be a button or have an accessible label and keyboard
  support.
- The renderer should be able to update an existing grid rather than rebuilding
  the whole page every time.
- A status area showing whose turn it is, the last result, and the winner.
- Both boards should be visible at the same time.

Important design points:

- The enemy board must never reveal ship locations in the DOM before they are
  hit. Do not render a hidden ship with a class that reveals it.
- The renderer receives state; it does not decide whether an attack is legal.
- Use CSS classes rather than inline styles so tests can assert on class names.
- Keep the cell coordinates in data attributes; do not infer them from DOM
  order.

### Tests for this feature

- The renderer creates 10 rows and 10 columns.
- Every cell has the correct row and column attributes.
- The player's own board shows ship cells.
- The enemy board hides un-attacked ship cells.
- A hit cell renders as hit on both boards.
- A miss cell renders as miss.
- A cell that has not been attacked does not render as hit or miss.
- Changing the board state and re-rendering updates the correct cells.
- Re-rendering does not duplicate cells or event listeners.
- Sunk ships are marked if you implement that feature.
- The status area shows the current turn.
- The status area shows the winner when the game is over.

For DOM tests, either use a lightweight DOM library with Deno or test the pure
view model first and keep a very small DOM test for element structure. Do not
let DOM setup dominate the test suite.

**Done when:** You can render an arbitrary game state and assert on the
resulting cell states.

---

## Step 4: DOM controller and event listeners

**Goal:** Turn clicks into game actions and keep the screen in sync.

### What to build

- A controller module that owns:
  - the current game state
  - a busy flag for the computer's turn
  - references to the two board containers and the status element
  - an injected scheduler for the computer's delay, so tests do not wait on real
    time
- Event delegation on the enemy board container. Decode the row and column from
  the clicked cell.
- On a human click:
  - ignore the click if the game is over
  - ignore it if it is not the human's turn
  - ignore it if the computer is currently playing
  - call the game module
  - re-render both boards and the status
  - if the game is not over, mark busy, schedule the computer turn, then
    re-render and clear busy
- A restart button wired to the game's reset function.
- No rule logic in the controller. It should only coordinate.

Important design points:

- The controller must not compute hits, sinks, or winners.
- The computer move should happen after the human move is rendered, otherwise
  the user never sees their result.
- Use one injected delay function rather than calling `setTimeout` directly all
  over the module. Tests can replace it with an immediate function.
- Prevent double clicks during the computer's turn. This is a real bug in many
  implementations.
- Use event delegation rather than attaching 100 listeners on every render.

### Tests for this feature

- Clicking an enemy cell calls the game with the correct coordinates.
- Clicking a cell on the player's own board does nothing.
- Clicking during the computer's turn does nothing.
- Double-clicking quickly does not produce two human attacks.
- A human hit updates the enemy board and the status.
- A human miss updates the enemy board and the status.
- An already-attacked cell shows a message and does not consume the turn.
- After a human move, the computer move is scheduled exactly once.
- After the computer move, control returns to the human.
- When the human wins, no computer move is scheduled.
- When the computer wins, the enemy board and controls are disabled.
- Restart resets both boards, the status, the turn, and the winner.
- The controller never calls Board, Fleet, or Player attack functions directly.

**Done when:** You can simulate clicks in a test DOM and play a full game with a
fake scheduler.

---

## Step 5: End-game behaviour

**Goal:** Make the ending clear and prevent further play.

### What to build

- A winner message: "You win" or "Computer wins".
- Disable or ignore all attack clicks after the game ends.
- Reveal the computer's remaining ships at the end if you want that behaviour.
- Keep the restart button active.
- Optionally show a summary: hits, misses, sunk ships.

### Tests for this feature

- The game ends the moment the last ship is sunk.
- Further clicks do nothing.
- The correct winner text is displayed.
- The computer's board is revealed only after the game ends, if you implement
  that.
- Restart clears the winner text and re-enables play.
- The game does not end when only some ships are sunk.
- The game does not end after a miss.

**Done when:** A full game can be played to completion and restarted.

---

## Step 6: Predetermined placement

**Goal:** Set up both fleets before real placement UI exists.

This matches the assignment: first use fixed coordinates, then add placement
later.

### What to build

- A placement list for the human and the computer: ship type, ID, start
  coordinate, orientation.
- A setup function that loops through the list and calls the player's atomic
  `placeShip` function.
- A hard failure if any placement is invalid, so bugs do not silently produce
  incomplete fleets.
- Both fleets must be populated before the game enters the playing phase.

### Tests for this feature

- Every configured ship exists in the fleet.
- Every configured ship occupies the correct cells on the board.
- No two ships overlap.
- No ship is out of bounds.
- Fleet limits are respected.
- Setup fails loudly on an invalid placement.
- The game cannot start with an empty fleet.
- The human and computer boards are independent.
- Setup is deterministic across runs.

**Done when:** The game starts in a known, valid state every time.

---

## Step 7: Ship placement system

**Goal:** Let the human place ships instead of using fixed coordinates.

Choose one approach, or both:

- **Manual:** select a ship, choose horizontal or vertical, click a starting
  cell.
- **Random:** a button that places all remaining ships randomly.

### What to build

- A placement phase in the game state.
- A current selected ship and orientation in the UI state. This is UI state, not
  game rules.
- A preview of the cells the ship would occupy, with valid and invalid styling.
- Placement validation through the player's existing atomic placement function.
- Undo or reset placement if you want it.
- A random placement helper that:
  - tries random coordinates and orientations
  - checks validity before committing
  - retries a bounded number of times
  - fails clearly if it cannot place everything
- A "Start game" action that is enabled only when all required ships are placed.

### Tests for this feature

- Selecting a ship and clicking a valid cell places it on the board and in the
  fleet.
- Placement updates the preview and the board rendering.
- Placing out of bounds is rejected and leaves state unchanged.
- Placing over another ship is rejected.
- A ship cannot be placed twice.
- Exceeding the fleet limit is rejected.
- Changing orientation changes the preview direction.
- Invalid placements show invalid styling.
- The start button is disabled until all ships are placed.
- Manual placement and random placement both produce a legal fleet.
- Random placement never overlaps ships or leaves the board.
- Random placement uses the injected random generator, so tests are
  deterministic.
- Starting the game switches the phase from placing to playing.
- Attacks are rejected during the placement phase.
- Undo or reset restores the previous state correctly, if implemented.

**Done when:** A player can place a full fleet manually or randomly, and the
game only starts when placement is complete.

---

## Step 8: Full integration and manual checks

**Goal:** Prove the pieces work together.

Write one or two end-to-end tests in the game/controller layer:

- Set up both fleets.
- Simulate human and computer turns until one fleet is sunk.
- Assert that the winner is correct.
- Assert that no move was repeated.
- Assert that the game rejects input after the end.

Then do a manual pass:

- Both boards are visible.
- The enemy ships are hidden before being hit.
- Hits and misses are visually distinct.
- The status updates after every move.
- The computer does not shoot the same cell twice.
- The computer's turn cannot be interrupted by clicking.
- The game ends at the right moment.
- Restart works repeatedly.
- Keyboard and screen-reader labels work for the grid cells.

---

## Suggested file layout

- `src/entities/player/player.ts` and `player_test.ts`
- `src/game/game.ts` and `game_test.ts`
- `src/ui/render.ts` and `render_test.ts`
- `src/ui/controller.ts` and `controller_test.ts`
- `src/ui/placement.ts` and `placement_test.ts`, if placement gets large
- `main.ts` only bootstraps the controller

---

## Testing order and habits

Follow this loop for each step:

1. Write one failing test for the smallest behaviour.
2. Implement only enough to pass.
3. Run the whole suite, not just the new file.
4. Refactor while green.
5. Check coverage for the new module.
6. Commit the feature and its tests together, matching your existing
   PR-per-feature workflow.

Keep the domain tests free of DOM and timers. Use injected randomness and
injected scheduling in the controller. That is what makes the computer and the
UI testable without flaky sleeps or brittle DOM assumptions.

The single most important rule running through all of this: the controller
coordinates, the renderer displays, and Game/Player/Board/Fleet decide the
rules. If a test needs to know a game rule, it should live in the domain layer,
not in a DOM test.
