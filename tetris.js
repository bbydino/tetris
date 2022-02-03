const NEXTLEVELLINES = 7; // number of lines needed for next level
const TETROMINOS = ["T", "O", "L", "J", "I", "S", "Z"];
const START_LEVEL = 10; // default start level
const ARENA_WIDTH = 10;
const ARENA_HEIGHT = 24;
const BG_COLOR = "#000000";

let canvas;
let ctx;
let pauseBtn;
let resetBtn;
let myReq;
let pause = true;

let arena;

let tempLines = 0; // lines to keep track for each level

let dropCounter = 0;
let dropInterval = 700; // number of milliseconds for each drop
let lastTime = 0;
let sevenBag = [];

// The tetromino pieces
// Colors of the tetrominos. The INDECES MATTER FOR THIS PROGRAM.
const COLORS = [
  null,
  "#994CCC",
  "#FFD500",
  "#FF971C",
  "#0341AE",
  "#66F5F9",
  "#72CB3B",
  "#FF3213",
];

const player = {
  pos: { x: 0, y: 0 },
  piece: null,
  score: 0,
  lines: 0,
  level: 1,
};

// reset the seven bag to all 7 tetrominos
function resetSevenBag() {
  sevenBag = TETROMINOS.map((x) => x);
}

function setupGame() {
  // Setup canvas
  canvas = document.getElementById("tetris");
  ctx = canvas.getContext("2d");
  canvas.width = 15 * ARENA_WIDTH;
  canvas.height = 15 * ARENA_HEIGHT;
  ctx.scale(15, 15);

  // Setup buttons
  pauseBtn = document.getElementById("pausebtn");
  pauseBtn.addEventListener("click", pauseButtonHandler);
  pauseBtn.disabled = true;
  pauseBtn.style.opacity = 0;
  resetBtn = document.getElementById("resetbtn");
  resetBtn.addEventListener("click", resetButtonHandler);
  resetBtn.style.opacity = 1;
  resetBtn.disabled = false;

  // Create the arena
  arena = createMatrix(ARENA_WIDTH, ARENA_HEIGHT);

  // Add key press listener
  document.addEventListener("keydown", handleKeyPress);

  // Load up the scores and reset the player.
  updateScore();
  updateLevel();
  updateLines();

  // Draw the empty canvas
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function update(time = 0) {
  const delta = time - lastTime;
  lastTime = time;

  dropCounter += delta;
  if (dropCounter > dropInterval / (player.level * 0.8)) playerDrop();

  draw();
  if (pause) return;
  myReq = undefined;
  startGame();
}

// Creates a tetromino piece based on the parameter letter
function createTetromino(type) {
  if (type === "T") {
    // T tetromino
    return [
      [1, 1, 1],
      [0, 1, 0],
      [0, 0, 0],
    ];
  } else if (type === "O") {
    // O (square) tetromino. In a 2x2 matrix
    return [
      [2, 2],
      [2, 2],
    ];
  } else if (type === "L") {
    // L tetromino
    return [
      [0, 3, 0],
      [0, 3, 0],
      [0, 3, 3],
    ];
  } else if (type === "J") {
    // J tetromino
    return [
      [0, 4, 0],
      [0, 4, 0],
      [4, 4, 0],
    ];
  } else if (type === "I") {
    // I tetromino. In a 4x4 matrix to make it easier to rotate
    return [
      [0, 5, 0, 0],
      [0, 5, 0, 0],
      [0, 5, 0, 0],
      [0, 5, 0, 0],
    ];
  } else if (type === "S") {
    // S tetromino
    return [
      [0, 6, 6],
      [6, 6, 0],
      [0, 0, 0],
    ];
  } else if (type === "Z") {
    // Z tetromino
    return [
      [7, 7, 0],
      [0, 7, 7],
      [0, 0, 0],
    ];
  }
}

// Creates a matrix of width w and height h
function createMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}

function playerReset() {
  // reset the bag if we have gotten all 7 already
  if (sevenBag.length === 0) resetSevenBag();

  // Generate a random tetromino
  // remove from seven bag when generated
  let idx = (Math.random() * sevenBag.length) | 0;
  player.piece = createTetromino(sevenBag[idx]);
  sevenBag.splice(idx, 1);

  // Put the piece in the middle of the top row
  player.pos.y = 0;
  player.pos.x =
    ((arena[0].length / 2) | 0) - ((player.piece[0].length / 2) | 0); // | 0 is a floor

  // GAME OVER. If we collide right when we generate a new piece, we have hit the top.
  if (collision(arena, player)) {
    stopGame();
    document.getElementById("status-label").innerText = "GAME OVER...";
    pauseBtn.disabled = true;
    pauseBtn.style.opacity = 0;
    resetBtn.style.opacity = 1;
    resetBtn.disabled = false;
  }
}

// MOVES THE PLAYER LEFT OR RIGHT, GIVEN A DIRECTION PARAMETER
function playerMove(dir) {
  player.pos.x += dir;
  // If we collided, move back to where we were (user will just see no movement)
  if (collision(arena, player)) {
    player.pos.x -= dir;
  }
}

// MAKES THE PLAYER GO DOWN
function playerDrop() {
  player.pos.y++;
  dropCounter = 0;
  if (collision(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    arenaSweep();
    playerReset();
  }
}

// MAKES THE PIECE GO ALL THE WAY TO THE BOTTOM
function playerDropAll() {
  // Keep incrementing y pos until there is a collision. When there is, merge the piece, get new piece
  while (!collision(arena, player)) {
    player.pos.y++;
    dropCounter = 0;
  }
  player.pos.y--;
  merge(arena, player);
  arenaSweep();
  playerReset();
}

// ROTATES THE PLAYER PIECE (CW OR CCW) GIVEN A DIRECTION PARAMETER
function playerRotate(dir) {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.piece, dir);
  // while the player rotated into a collision
  while (collision(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.piece[0].length) {
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
}

// Draws the arena and player piece
function draw() {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawMatrix(arena, { x: 0, y: 0 }); // Draw the stuck pieces, no shift
  drawMatrix(player.piece, player.pos); // draw the current piece
}

// DRAWS A MATRIX with the shift
function drawMatrix(matrix, shift) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        ctx.fillStyle = COLORS[value];
        ctx.fillRect(x + shift.x, y + shift.y, 1, 1);
      }
    });
  });
}

// IN ORDER to rotate a matrix, we transpose it (swap all x and y), then REVERSE it.
function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < y; x++) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }

  if (dir < 0) {
    matrix.forEach((row) => row.reverse());
  } else {
    matrix.reverse();
  }
}

// Checks for collision
function collision(arena, player) {
  const [m, o] = [player.piece, player.pos];

  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < m[y].length; x++) {
      if (
        m[y][x] !== 0 && // if player matrix at y and x is not 0
        (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0 // if arena has a row
      ) {
        // if arena has a column at that row and is not 0
        return true;
      }
    }
  }
  return false;
}

// merges the arena and player matrices
function merge(arena, player) {
  console.log("merge");
  player.piece.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value;
        //console.log(`y:${y}, x:${x}, pos.y:${player.pos.y}, pos.x:${player.pos.x}`);
        //console.log(`y:${y + player.pos.y}, x:${x + player.pos.x}`);
      }
    });
  });
}

// Check if there are rows to delete, and adds score/level accordingly
function arenaSweep() {
  let rowCount = 1;
  outer: for (let y = arena.length - 1; y > 0; y--) {
    // scan from the bottom up
    for (let x = 0; x < arena[y].length; x++) {
      // from left to right
      if (arena[y][x] === 0) {
        continue outer; // continue our OUTER for loop
      }
    }

    const row = arena.splice(y, 1)[0].fill(0); // takes the row from index y out and blanks it
    arena.unshift(row); // add on the top of the arena
    y++;

    player.score += rowCount * 10; // add to the score
    rowCount *= 2; // For every row, double the amount of points it would get

    // update lines and level (if we got enough lines)
    player.lines++;
    tempLines++;
    if (tempLines >= NEXTLEVELLINES) {
      // reached enough lines to get to next level
      tempLines = 0;
      player.level++;
      updateLevel();
    }
  }
  updateScore();
  updateLines();
}

// UPDATE TEXT ON WEBPAGE
function updateScore() {
  document.getElementById("player-score").innerText = player.score;
}
function updateLevel() {
  document.getElementById("player-level").innerText = player.level;
}
function updateLines() {
  document.getElementById("player-lines").innerText = player.lines;
}

// ALL THE KEYS THAT ARE USED
function handleKeyPress(e) {
  if (pause) return;
  if (e.keyCode === 83 || e.keyCode === 40) {
    // 's' or down
    playerDrop();
  } else if (e.keyCode === 65 || e.keyCode === 37) {
    // 'a' or left
    playerMove(-1);
  } else if (e.keyCode === 68 || e.keyCode === 39) {
    // 'd' or right
    playerMove(1);
  } else if (e.keyCode === 87) {
    // 'w' or rotate CW
    playerRotate(-1);
  } else if (e.keyCode === 38) {
    // 'uparrow' or rotate CCW
    playerRotate(1);
  } else if (e.keyCode === 32) {
    // 'space bar' or full drop
    playerDropAll();
  }
}
// PAUSE THE GAME BUTTON HANDLER
function pauseButtonHandler() {
  if (pause) {
    // unpause if prevously paused
    startGame();
    pauseBtn.innerText = "Pause";
    document.getElementById("status-label").innerText = "Playing!!!";
    document.getElementById("status-label").style.animation = "none"; // cancel animation while playing
  } else {
    // pause if prevously unpaused
    stopGame();
    pauseBtn.innerText = "Unpause";
    document.getElementById("status-label").innerText = "Paused...";
    document.getElementById("status-label").style.animation = ""; // inherits style from CSS file
  }
}
// RESET GAME BUTTON HANDLER. reset settings and start the game!
function resetButtonHandler() {
  resetSevenBag();
  resetGame();
  startGame();
  pauseBtn.disabled = false;
  pauseBtn.style.opacity = 1;
  resetBtn.style.opacity = 0;
  resetBtn.disabled = true;
  document.getElementById("status-label").innerText = "Playing!!!";
  document.getElementById("status-label").style.animation = "none"; // Cancel animation while playing
}
// MAKES ALL BUTTONS NOT FOCUSED AFTER CLICKS!
document.querySelectorAll("button").forEach((item) => {
  item.addEventListener("focus", () => {
    item.blur();
  });
});

// STARTS THE ANIMATION LOOP
function startGame() {
  if (!myReq) {
    pause = false;
    myReq = requestAnimationFrame(update);
  }
}
// STOPS THE ANIMATION LOOP
function stopGame() {
  if (myReq) {
    pause = true;
    cancelAnimationFrame(myReq);
    myReq = undefined;
  }
}
// RESETS ALL THE PLAYER SETTINGS
function resetGame() {
  arena.forEach((row) => row.fill(0)); // reset arena
  player.score = 0; // reset score
  player.level = START_LEVEL; // reset level
  player.lines = 0; // reset number of lines
  updateScore();
  updateLevel();
  updateLines();
  playerReset();
}

// set up the canvas
setupGame();
