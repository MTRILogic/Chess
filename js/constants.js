// Chess game constants
export const COLORS = {
  WHITE: 'w',
  BLACK: 'b'
};

export const PIECES = {
  KING: 'k',
  QUEEN: 'q',
  ROOK: 'r',
  BISHOP: 'b',
  KNIGHT: 'n',
  PAWN: 'p'
};

// Board dimensions
export const BOARD_SIZE = 8;

// Chess piece values for AI evaluation
export const PIECE_VALUES = {
  [PIECES.PAWN]: 10,
  [PIECES.KNIGHT]: 30,
  [PIECES.BISHOP]: 30,
  [PIECES.ROOK]: 50,
  [PIECES.QUEEN]: 90,
  [PIECES.KING]: 900
};

// Special move flags
export const MOVE_FLAGS = {
  NORMAL: 'n',
  CAPTURE: 'c',
  EN_PASSANT: 'e',
  PROMOTION: 'p',
  CASTLE_KING: 'k',
  CASTLE_QUEEN: 'q',
  CASTLE: 'castle',
  DOUBLE_PAWN_PUSH: 'd',
};

// Game states
export const GAME_STATES = {
  ACTIVE: 'active',
  CHECK: 'check',
  CHECKMATE: 'checkmate',
  STALEMATE: 'stalemate',
  DRAW_MATERIAL: 'draw_material',
  DRAW_FIFTY: 'draw_fifty',
  DRAW_REPETITION: 'draw_repetition'
};

// Piece image mapping (URL paths for pieces)
export const PIECE_IMAGES = {
  'wk': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
  'wq': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
  'wr': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
  'wb': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
  'wn': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
  'wp': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
  'bk': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
  'bq': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
  'br': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
  'bb': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
  'bn': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
  'bp': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg'
};

// Directions for piece movement
export const DIRECTIONS = {
  DIAGONAL: [
    { row: 1, col: 1 },
    { row: 1, col: -1 },
    { row: -1, col: 1 },
    { row: -1, col: -1 }
  ],
  STRAIGHT: [
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: -1, col: 0 }
  ],
  KNIGHT: [
    { row: 2, col: 1 },
    { row: 2, col: -1 },
    { row: -2, col: 1 },
    { row: -2, col: -1 },
    { row: 1, col: 2 },
    { row: 1, col: -2 },
    { row: -1, col: 2 },
    { row: -1, col: -2 }
  ],
  KING: [
    { row: 1, col: 1 },
    { row: 1, col: 0 },
    { row: 1, col: -1 },
    { row: 0, col: 1 },
    { row: 0, col: -1 },
    { row: -1, col: 1 },
    { row: -1, col: 0 },
    { row: -1, col: -1 }
  ]
};