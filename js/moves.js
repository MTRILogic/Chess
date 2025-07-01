import { MOVE_FLAGS, COLORS, PIECES } from './constants.js';
import { positionToAlgebraic } from './utils.js';

// Convert a move object to a string representation for storage/comparison
export function moveToString(move) {
  if (!move) return '';
  return `${positionToAlgebraic(move.from)}-${positionToAlgebraic(move.to)}${move.flag || ''}${move.promotion || ''}`;
}

// Check if two moves are equal
export function movesAreEqual(move1, move2) {
  if (!move1 || !move2) return false;
  
  return move1.from.row === move2.from.row && 
         move1.from.col === move2.from.col && 
         move1.to.row === move2.to.row && 
         move1.to.col === move2.to.col && 
         move1.flag === move2.flag && 
         move1.promotion === move2.promotion;
}

// Get all possible pawn promotion moves for a given move
export function getPawnPromotionMoves(move) {
  if (move.flag !== MOVE_FLAGS.PROMOTION) return [move];
  
  const promotionPieces = [PIECES.QUEEN, PIECES.ROOK, PIECES.BISHOP, PIECES.KNIGHT];
  return promotionPieces.map(promotionPiece => ({
    ...move,
    promotion: promotionPiece
  }));
}

// Get the actual destination for a move (accounting for castling)
export function getMoveDestination(move) {
  if (move.flag === MOVE_FLAGS.CASTLE_KING) {
    // King moves 2 squares to the right
    return { row: move.from.row, col: move.from.col + 2 };
  }
  if (move.flag === MOVE_FLAGS.CASTLE_QUEEN) {
    // King moves 2 squares to the left
    return { row: move.from.row, col: move.from.col - 2 };
  }
  return move.to;
}

// Get all valid moves for a specific square
export function getMovesForSquare(board, row, col) {
  const validMoves = [];
  const allMoves = board.getAllValidMoves();
  
  for (const move of allMoves) {
    if (move.from.row === row && move.from.col === col) {
      validMoves.push(move);
    }
  }
  
  return validMoves;
}

// Find a move in a list of moves
export function findMove(moves, fromRow, fromCol, toRow, toCol) {
  return moves.find(move => 
    move.from.row === fromRow &&
    move.from.col === fromCol &&
    move.to.row === toRow &&
    move.to.col === toCol
  );
}