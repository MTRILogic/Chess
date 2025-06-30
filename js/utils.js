import { BOARD_SIZE, COLORS, PIECES, PIECE_VALUES } from './constants.js';

// Check if position is valid on the board
export function isValidPosition(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

// Convert algebraic notation (e.g. "e4") to row/col position
export function algebraicToPosition(algebraic) {
  const col = algebraic.charCodeAt(0) - 'a'.charCodeAt(0);
  const row = BOARD_SIZE - parseInt(algebraic.charAt(1));
  return { row, col };
}

// Convert row/col position to algebraic notation
export function positionToAlgebraic(position) {
  const file = String.fromCharCode('a'.charCodeAt(0) + position.col);
  const rank = BOARD_SIZE - position.row;
  return file + rank;
}

// Get piece symbol for algebraic notation
export function getPieceSymbol(piece) {
  if (!piece) return '';
  
  const symbols = {
    [PIECES.KING]: 'K',
    [PIECES.QUEEN]: 'Q',
    [PIECES.ROOK]: 'R',
    [PIECES.BISHOP]: 'B',
    [PIECES.KNIGHT]: 'N',
    [PIECES.PAWN]: ''
  };
  
  return symbols[piece.type];
}

// Convert a move to algebraic notation
export function moveToAlgebraic(move, board) {
  if (!move) return '';

  const fromPos = move.from;
  const toPos = move.to;
  const piece = board[fromPos.row][fromPos.col];
  
  if (!piece) return '';
  
  // Handle castling
  if (piece.type === PIECES.KING) {
    if (fromPos.col - toPos.col === 2) return 'O-O-O'; // Queenside
    if (toPos.col - fromPos.col === 2) return 'O-O';   // Kingside
  }
  
  let notation = getPieceSymbol(piece);
  
  // Add 'x' for captures
  const targetPiece = board[toPos.row][toPos.col];
  if (targetPiece || move.flag === 'e') { // Regular capture or en passant
    if (piece.type === PIECES.PAWN) {
      notation += positionToAlgebraic(fromPos)[0]; // Add file for pawn captures
    }
    notation += 'x';
  }
  
  // Add destination
  notation += positionToAlgebraic(toPos);
  
  // Add promotion piece
  if (move.flag === 'p') {
    notation += '=' + getPieceSymbol({ type: move.promotion || PIECES.QUEEN });
  }
  
  return notation;
}

// Deep clone a board position
export function cloneBoard(board) {
  return board.map(row => [...row]);
}

// Evaluate a board position (for AI)
export function evaluatePosition(board, color) {
  let score = 0;
  
  // Material value
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece) {
        const value = PIECE_VALUES[piece.type];
        if (piece.color === color) {
          score += value;
          
          // Bonus for position (simple version)
          if (piece.type === PIECES.PAWN) {
            // Pawns get bonuses for advancing
            const advanceRow = piece.color === COLORS.WHITE ? BOARD_SIZE - 1 - row : row;
            score += advanceRow * 1; // Small bonus for each row advanced
          } else if (piece.type === PIECES.KNIGHT || piece.type === PIECES.BISHOP) {
            // Bonus for knights and bishops being in the center
            const centerDistance = Math.abs(3.5 - row) + Math.abs(3.5 - col);
            score += (4 - centerDistance) * 0.5;
          }
        } else {
          score -= value;
        }
      }
    }
  }
  
  return score;
}

// Save game to local storage
export function saveGame(gameState) {
  const saveData = {
    currentPosition: gameState.getFEN(),
    moveHistory: gameState.getMoveHistory(),
    date: new Date().toISOString()
  };
  
  try {
    localStorage.setItem('chessGameSave', JSON.stringify(saveData));
    return true;
  } catch (e) {
    console.error('Failed to save game:', e);
    return false;
  }
}

// Load game from local storage
export function loadGame() {
  try {
    const saveData = JSON.parse(localStorage.getItem('chessGameSave'));
    if (!saveData) return null;
    return saveData;
  } catch (e) {
    console.error('Failed to load game:', e);
    return null;
  }
}

// Generate FEN notation from board
export function generateFEN(board, currentPlayer, castlingRights, enPassantTarget, halfMoveClock, fullMoveNumber) {
  let fen = '';
  
  // Board position
  for (let row = 0; row < BOARD_SIZE; row++) {
    let emptyCount = 0;
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece) {
        if (emptyCount > 0) {
          fen += emptyCount;
          emptyCount = 0;
        }
        let symbol = piece.type;
        if (piece.color === COLORS.WHITE) {
          symbol = symbol.toUpperCase();
        }
        fen += symbol;
      } else {
        emptyCount++;
      }
    }
    if (emptyCount > 0) {
      fen += emptyCount;
    }
    if (row < BOARD_SIZE - 1) {
      fen += '/';
    }
  }
  
  // Active color
  fen += ' ' + currentPlayer;
  
  // Castling availability
  fen += ' ' + castlingRights;
  
  // En passant target square
  fen += ' ' + (enPassantTarget || '-');
  
  // Halfmove clock
  fen += ' ' + halfMoveClock;
  
  // Fullmove number
  fen += ' ' + fullMoveNumber;
  
  return fen;
}