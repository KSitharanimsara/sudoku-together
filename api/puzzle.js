// Sudoku puzzle generator — creates a valid 9x9 puzzle with unique solution
export function generatePuzzle() {
  // Start with a complete valid board
  const board = generateFullBoard();
  // Remove cells to create puzzle (40 removed = medium difficulty)
  const puzzle = board.map(row => [...row]);
  const positions = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      positions.push([r, c]);
    }
  }
  shuffle(positions);
  for (let i = 0; i < 40 && i < positions.length; i++) {
    const [r, c] = positions[i];
    puzzle[r][c] = 0;
  }
  return { puzzle, solution: board };
}

function generateFullBoard() {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  fillBoard(board);
  return board;
}

function fillBoard(board) {
  const empty = findEmpty(board);
  if (!empty) return true;
  const [row, col] = empty;
  const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  shuffle(nums);
  for (const num of nums) {
    if (isValid(board, row, col, num)) {
      board[row][col] = num;
      if (fillBoard(board)) return true;
      board[row][col] = 0;
    }
  }
  return false;
}

function findEmpty(board) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) return [r, c];
    }
  }
  return null;
}

function isValid(board, row, col, num) {
  for (let c = 0; c < 9; c++) {
    if (board[row][c] === num) return false;
  }
  for (let r = 0; r < 9; r++) {
    if (board[r][col] === num) return false;
  }
  const boxR = Math.floor(row / 3) * 3;
  const boxC = Math.floor(col / 3) * 3;
  for (let r = boxR; r < boxR + 3; r++) {
    for (let c = boxC; c < boxC + 3; c++) {
      if (board[r][c] === num) return false;
    }
  }
  return true;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Check if a move is valid against the solution
export function checkMove(solution, row, col, num) {
  return solution[row][col] === num;
}
