let canvas;
let ctx;

// The tetromino pieces
const TETROMINOS = [
    'T', 'O', 'L', 'J', 'I', 'S', 'Z'
];

// Colors of the tetrominos. The INDECES MATTER FOR THIS PROGRAM.
const COLORS = [
    null, 'purple', 'yellow', 'orange', 'blue', 'cyan', 'lime', 'red'
]

const player = {
    pos: {x: 0, y: 0},
    piece: null,
    score: 0,
    level: 1,
}

let arena;

let dropCounter = 0;
let dropInterval = 700;  // number of milliseconds for each drop
let lastTime = 0;        

function setupGame() {
    canvas = document.getElementById('tetris');
    ctx = canvas.getContext('2d');
    canvas.width = 240;
    canvas.height = 420;
    ctx.scale(15, 15);

    arena = createMatrix(16, 28);

    // Add key press listener
    document.addEventListener('keydown', handleKeyPress);

    updateScore();
    updateLevel();
    playerReset();
}

function update(time = 0) {
    const delta = time - lastTime;
    lastTime = time;

    dropCounter += delta;
    if (dropCounter > dropInterval) playerDrop();
    
    draw();
    requestAnimationFrame(update);
}
// Creates a tetromino piece based on the parameter letter
function createTetromino(type) {
    if (type === 'T') {         // T tetromino
        return [
            [1, 1, 1],
            [0, 1, 0],
            [0, 0, 0]
        ];
    }
    else if (type === 'O') {    // O (square) tetromino. In a 2x2 matrix
        return [
            [2, 2],
            [2, 2]
        ];
    }
    else if (type === 'L') {    // L tetromino
        return [
            [0, 3, 0],
            [0, 3, 0],
            [0, 3, 3]
        ];
    }
    else if (type === 'J') {    // J tetromino
        return [
            [0, 4, 0],
            [0, 4, 0],
            [4, 4, 0]
        ];
    }
    else if (type === 'I') {    // I tetromino. In a 4x4 matrix to make it easier to rotate
        return [
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0]
        ];
    }
    else if (type === 'S') {    // S tetromino
        return [
            [0, 6, 6],
            [6, 6, 0],
            [0, 0, 0]
        ];
    }
    else if (type === 'Z') {    // Z tetromino
        return [
            [7, 7, 0],
            [0, 7, 7],
            [0, 0, 0]
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
    // Generate a random tetromino
    player.piece = createTetromino(
            TETROMINOS[(Math.random() * TETROMINOS.length) | 0]
            );

    // Put the piece in the middle of the grid
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) -
                    (player.piece[0].length / 2 | 0);  // | 0 is a floor

    // GAME OVER. If we collide right when we generate a new piece, we have hit the top. 
    if (collision(arena, player)) {
        arena.forEach(row => row.fill(0));  // reset arena
        player.score = 0;
        updateScore();
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
        playerReset();
        arenaSweep();
    }
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

function draw() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);   
    
    drawMatrix(arena, {x: 0, y:0});  // Draw the stuck pieces, no shift
    drawMatrix(player.piece, player.pos);  // draw the current piece
}

function drawMatrix(matrix, shift) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
            ctx.fillStyle = COLORS[value];
            ctx.fillRect(x + shift.x, 
                            y + shift.y, 1, 1);
            }
        });
    });
}

// IN ORDER to rotate a matrix, we transpose it (swap all x and y), then REVERSE it.
function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < y; x++) {
            [
                matrix[x][y],
                matrix[y][x],
            ] = [
                matrix[y][x],
                matrix[x][y],
            ];
        }
    }

    if (dir < 0) {
        matrix.forEach(row => row.reverse());
    }
    else {
        matrix.reverse();
    }
}

// Checks for collision
function collision(arena, player) {
    const [m, o] = [player.piece, player.pos];

    for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
            if (m[y][x] !== 0 &&                   // if player matrix at y and x is not 0
                (arena[y + o.y] &&                  // if arena has a row
                arena[y + o.y][x + o.x]) !== 0) {   // if arena has a column at that row and is not 0
                    return true;
                }
        }
    }
    return false;
}

// merges the arena and player matrices
function merge(arena, player) {
    player.piece.forEach((row, y)=> {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

// Check if there are rows to delete
function arenaSweep() {
    let rowCount = 1;
    outer: for (let y = arena.length-1; y > 0; y--) {
        for (let x = 0; x < arena[y].length; x++) {
            if (arena[y][x] === 0) {
                continue outer;  // continue our OUTER for loop
            }
        }

        const row = arena.splice(y, 1)[0].fill(0);  // takes the row from index y out and blanks it
        arena.unshift(row);  // add on the top of the arena
        y++;

        player.score += rowCount * 10;
        rowCount *= 2;  // For every row, double the amount of points it would get
    }
    updateScore();
}

function updateScore() {
    document.getElementById('player-score').innerText = player.score;
}

function updateLevel() {
    document.getElementById('player-level').innerText = player.level;
}

// ALL THE KEYS THAT ARE USED
function handleKeyPress(e) {
    if (e.keyCode === 83 || e.keyCode === 40) {       // 's' or down
        playerDrop();
    }
    else if (e.keyCode === 65 || e.keyCode === 37) {  // 'a' or left
        playerMove(-1);
    }
    else if (e.keyCode === 68 || e.keyCode === 39) {  // 'd' or right
        playerMove(1);
    }
    else if (e.keyCode === 66) {  // 'b' or rotate CW
        playerRotate(-1);
    }
    else if (e.keyCode === 78) {  // 'n' or rotate CCW
        playerRotate(1);
    }
    else if (e.keyCode === 32) {  // 'space bar' or full drop
    }
}



// set up the canvas
setupGame();

// start the game
update();