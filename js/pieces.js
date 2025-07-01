import { COLORS, PIECES, DIRECTIONS, MOVE_FLAGS } from './constants.js';
import { isValidPosition } from './utils.js';

// Base piece class
export class Piece {
  constructor(color) {
    this.color = color;
    this.hasMoved = false;
  }

  getValidMoves(board, position) {
    return [];
  }

  generateMoves(board, position, directions, maxDistance = 7) {
    const moves = [];
    const { row, col } = position;

    for (const direction of directions) {
      for (let distance = 1; distance <= maxDistance; distance++) {
        const newRow = row + direction.row * distance;
        const newCol = col + direction.col * distance;
        
        if (!isValidPosition(newRow, newCol)) break;
        
        const targetPiece = board[newRow][newCol];
        
        if (!targetPiece) {
          // Empty square
          moves.push({
            from: { row, col },
            to: { row: newRow, col: newCol },
            flag: MOVE_FLAGS.NORMAL
          });
        } else {
          // Capture
          if (targetPiece.color !== this.color) {
            moves.push({
              from: { row, col },
              to: { row: newRow, col: newCol },
              flag: MOVE_FLAGS.CAPTURE,
              capturedPiece: targetPiece
            });
          }
          break; // Can't move further in this direction
        }
      }
    }
    
    return moves;
  }
}

export class King extends Piece {
  constructor(color) {
    super(color);
    this.type = PIECES.KING;
  }
  
  getValidMoves(board, position) {
    // If board is a ChessBoard object, use its board property
    const boardArray = Array.isArray(board) ? board : board.board;
    
    const moves = this.generateMoves(boardArray, position, DIRECTIONS.KING, 1);
    
    // Add castling moves if applicable
    if (!this.hasMoved) {
      const { row, col } = position;
      
      // Log to help debug
      console.log(`King at ${row},${col} checking for castle moves, hasMoved=${this.hasMoved}`);
      
      // Kingside castling (short castle)
      if (this.canCastle(boardArray, position, true)) {
        console.log("Kingside castling is valid");
        moves.push({
          from: { row, col },
          to: { row, col: col + 2 },
          flag: MOVE_FLAGS.CASTLE_KING
        });
      }
      
      // Queenside castling (long castle)
      if (this.canCastle(boardArray, position, false)) {
        console.log("Queenside castling is valid");
        moves.push({
          from: { row, col },
          to: { row, col: col - 2 },
          flag: MOVE_FLAGS.CASTLE_QUEEN
        });
      }
    }
    
    return moves;
  }
  
  canCastle(board, position, kingSide) {
    const { row, col } = position;
    const rookCol = kingSide ? 7 : 0;
    
    // Check if rook is in place and hasn't moved
    const rook = board[row][rookCol];
    if (!rook || rook.type !== PIECES.ROOK || rook.color !== this.color || rook.hasMoved) {
      console.log(`Castling ${kingSide ? 'kingside' : 'queenside'} not possible: rook condition not met`);
      return false;
    }
    
    // Check if squares between king and rook are empty
    if (kingSide) {
      // Kingside: Check squares between king and rook (usually columns 5 and 6)
      for (let c = col + 1; c < rookCol; c++) {
        if (board[row][c]) {
          console.log(`Kingside castling not possible: square at ${row},${c} is occupied`);
          return false;
        }
      }
    } else {
      // Queenside: Check squares between king and rook (usually columns 1, 2, 3)
      for (let c = rookCol + 1; c < col; c++) {
        if (board[row][c]) {
          console.log(`Queenside castling not possible: square at ${row},${c} is occupied`);
          return false;
        }
      }
    }
    
    // At this point, the castling move is valid based on piece positions
    // The check for whether king is in check or passes through check will be handled
    // by the board's wouldBeInCheckAfterMove method
    
    return true;
  }
}

export class Queen extends Piece {
  constructor(color) {
    super(color);
    this.type = PIECES.QUEEN;
  }
  
  getValidMoves(board, position) {
    return this.generateMoves(board, position, [
      ...DIRECTIONS.DIAGONAL,
      ...DIRECTIONS.STRAIGHT
    ]);
  }
}

export class Rook extends Piece {
  constructor(color) {
    super(color);
    this.type = PIECES.ROOK;
  }
  
  getValidMoves(board, position) {
    return this.generateMoves(board, position, DIRECTIONS.STRAIGHT);
  }
}

export class Bishop extends Piece {
  constructor(color) {
    super(color);
    this.type = PIECES.BISHOP;
  }
  
  getValidMoves(board, position) {
    return this.generateMoves(board, position, DIRECTIONS.DIAGONAL);
  }
}

export class Knight extends Piece {
  constructor(color) {
    super(color);
    this.type = PIECES.KNIGHT;
  }
  
  getValidMoves(board, position) {
    return this.generateMoves(board, position, DIRECTIONS.KNIGHT, 1);
  }
}

export class Pawn extends Piece {
  constructor(color) {
    super(color);
    this.type = PIECES.PAWN;
  }
  
  getValidMoves(board, position) {
    const moves = [];
    const { row, col } = position;
    const direction = this.color === COLORS.WHITE ? -1 : 1;
    const startRow = this.color === COLORS.WHITE ? 6 : 1;
    const promotionRow = this.color === COLORS.WHITE ? 0 : 7;
    
    // Forward move
    if (isValidPosition(row + direction, col) && !board[row + direction][col]) {
      const isPromotion = row + direction === promotionRow;
      moves.push({
        from: { row, col },
        to: { row: row + direction, col },
        flag: isPromotion ? MOVE_FLAGS.PROMOTION : MOVE_FLAGS.NORMAL
      });
      
      // Double forward move from starting position
      if (row === startRow && !board[row + direction][col] && !board[row + 2 * direction][col]) {
        moves.push({
          from: { row, col },
          to: { row: row + 2 * direction, col },
          flag: MOVE_FLAGS.DOUBLE_PAWN_PUSH
        });
      }
    }
    
    // Captures
    const captureColumns = [col - 1, col + 1];
    for (const captureCol of captureColumns) {
      if (isValidPosition(row + direction, captureCol)) {
        const targetPiece = board[row + direction][captureCol];
        
        if (targetPiece && targetPiece.color !== this.color) {
          const isPromotion = row + direction === promotionRow;
          moves.push({
            from: { row, col },
            to: { row: row + direction, col: captureCol },
            flag: isPromotion ? MOVE_FLAGS.PROMOTION : MOVE_FLAGS.CAPTURE,
            capturedPiece: targetPiece
          });
        }
      }
    }
    
    // En passant capture
    // This will be handled by the board class using lastMove information
    
    return moves;
  }
}

// Function to create a piece based on type and color
export function createPiece(type, color) {
  switch (type.toLowerCase()) {
    case PIECES.KING:
      return new King(color);
    case PIECES.QUEEN:
      return new Queen(color);
    case PIECES.ROOK:
      return new Rook(color);
    case PIECES.BISHOP:
      return new Bishop(color);
    case PIECES.KNIGHT:
      return new Knight(color);
    case PIECES.PAWN:
      return new Pawn(color);
    default:
      throw new Error(`Invalid piece type: ${type}`);
  }
}