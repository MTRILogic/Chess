import { COLORS, PIECE_VALUES } from './constants.js';
import { evaluatePosition, cloneBoard } from './utils.js';

export class ChessAI {
  constructor(difficulty = 1) {
    this.difficulty = difficulty; // 1=easy, 2=medium, 3=hard
    this.maxDepth = this.getDepthByDifficulty();
    this.positionsEvaluated = 0;
  }
  
  getDepthByDifficulty() {
    switch(this.difficulty) {
      case 1: return 1;  // Easy: 1-ply search (just material evaluation)
      case 2: return 2;  // Medium: 2-ply search
      case 3: return 3;  // Hard: 3-ply search
      default: return 2;
    }
  }

  setDifficulty(difficulty) {
    this.difficulty = difficulty;
    this.maxDepth = this.getDepthByDifficulty();
  }

  // Find the best move for the current player
  async findBestMove(chessBoard) {
    this.positionsEvaluated = 0;
    const color = chessBoard.currentPlayer;
    
    // Get all valid moves
    const validMoves = chessBoard.getAllValidMoves();
    
    if (validMoves.length === 0) {
      return null; // No valid moves (checkmate or stalemate)
    }
    
    // For easy mode, just make a random or simple move
    if (this.difficulty === 1) {
      return this.findSimpleMove(chessBoard, validMoves);
    }
    
    // For higher difficulties, use minimax with alpha-beta pruning
    let bestMoves = [];
    let bestScore = color === COLORS.WHITE ? -Infinity : Infinity;
    let alpha = -Infinity;
    let beta = Infinity;
    
    // Sort moves to improve alpha-beta pruning efficiency
    // Captures and promotions first
    validMoves.sort((a, b) => {
      const aValue = this.getMoveValue(a);
      const bValue = this.getMoveValue(b);
      return bValue - aValue;
    });
    
    for (const move of validMoves) {
      // Apply move
      const originalBoard = chessBoard.board.map(row => [...row]);
      const originalState = {
        currentPlayer: chessBoard.currentPlayer,
        castlingRights: JSON.parse(JSON.stringify(chessBoard.castlingRights)),
        enPassantTarget: chessBoard.enPassantTarget,
        halfMoveClock: chessBoard.halfMoveClock,
        fullMoveNumber: chessBoard.fullMoveNumber,
        gameState: chessBoard.gameState,
        moveHistory: [...chessBoard.moveHistory]
      };
      
      chessBoard.makeMove(move);
      
      // Evaluate position with minimax
      const score = this.minimax(
        chessBoard,
        this.maxDepth - 1,
        alpha,
        beta,
        color === COLORS.WHITE ? false : true
      );
      
      // Restore board state
      chessBoard.board = originalBoard;
      chessBoard.currentPlayer = originalState.currentPlayer;
      chessBoard.castlingRights = originalState.castlingRights;
      chessBoard.enPassantTarget = originalState.enPassantTarget;
      chessBoard.halfMoveClock = originalState.halfMoveClock;
      chessBoard.fullMoveNumber = originalState.fullMoveNumber;
      chessBoard.gameState = originalState.gameState;
      chessBoard.moveHistory = originalState.moveHistory;
      
      // Update best move
      if (color === COLORS.WHITE) {
        if (score > bestScore) {
          bestScore = score;
          bestMoves = [move];
          alpha = Math.max(alpha, score);
        } else if (Math.abs(score - bestScore) < 0.1) {
          // Keep track of equally good moves
          bestMoves.push(move);
        }
      } else {
        if (score < bestScore) {
          bestScore = score;
          bestMoves = [move];
          beta = Math.min(beta, score);
        } else if (Math.abs(score - bestScore) < 0.1) {
          // Keep track of equally good moves
          bestMoves.push(move);
        }
      }
    }
    
    // Choose randomly among equally good moves to add variety
    if (bestMoves.length > 0) {
      const randomIndex = Math.floor(Math.random() * bestMoves.length);
      return bestMoves[randomIndex];
    } else {
      // Fallback to a random move if something went wrong
      return validMoves[Math.floor(Math.random() * validMoves.length)];
    }
  }
  
  // Simple move finder for easy mode
  findSimpleMove(chessBoard, validMoves) {
    // First, try to find capturing moves
    const capturingMoves = validMoves.filter(move => 
      move.flag === 'c' || move.flag === 'e'
    );
    
    if (capturingMoves.length > 0) {
      // Find the most valuable capture
      const bestCapture = capturingMoves.reduce((best, move) => {
        if (!move.capturedPiece || !best.capturedPiece) return move;
        const currentValue = PIECE_VALUES[move.capturedPiece.type];
        const bestValue = PIECE_VALUES[best.capturedPiece.type];
        return currentValue > bestValue ? move : best;
      }, capturingMoves[0]);
      
      return bestCapture;
    }
    
    // Next, try to find check moves
    for (const move of validMoves) {
      // Apply move temporarily
      const originalBoard = chessBoard.board.map(row => [...row]);
      const originalPlayer = chessBoard.currentPlayer;
      
      chessBoard.makeMove(move);
      const givesCheck = chessBoard.isInCheck();
      
      // Restore board state
      chessBoard.board = originalBoard;
      chessBoard.currentPlayer = originalPlayer;
      
      if (givesCheck) {
        return move;
      }
    }
    
    // If no captures or checks, pick a random move
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }
  
  // Minimax with alpha-beta pruning
  minimax(chessBoard, depth, alpha, beta, isMaximizing) {
    this.positionsEvaluated++;
    
    // Base case: leaf node or game over
    if (depth === 0 || chessBoard.gameState !== 'active') {
      return this.evaluateBoard(chessBoard);
    }
    
    const validMoves = chessBoard.getAllValidMoves();
    
    // No valid moves means checkmate or stalemate
    if (validMoves.length === 0) {
      if (chessBoard.isInCheck()) {
        // Checkmate
        return isMaximizing ? -1000 - depth : 1000 + depth; // Prefer earlier checkmate
      } else {
        // Stalemate
        return 0;
      }
    }
    
    // Sort moves to improve alpha-beta pruning efficiency
    validMoves.sort((a, b) => {
      const aValue = this.getMoveValue(a);
      const bValue = this.getMoveValue(b);
      return isMaximizing ? bValue - aValue : aValue - bValue;
    });
    
    if (isMaximizing) {
      let maxEval = -Infinity;
      
      for (const move of validMoves) {
        // Apply move
        const originalBoard = chessBoard.board.map(row => [...row]);
        const originalState = {
          currentPlayer: chessBoard.currentPlayer,
          castlingRights: JSON.parse(JSON.stringify(chessBoard.castlingRights)),
          enPassantTarget: chessBoard.enPassantTarget,
          gameState: chessBoard.gameState,
        };
        
        chessBoard.makeMove(move);
        
        const evaluation = this.minimax(chessBoard, depth - 1, alpha, beta, false);
        
        // Restore board state
        chessBoard.board = originalBoard;
        chessBoard.currentPlayer = originalState.currentPlayer;
        chessBoard.castlingRights = originalState.castlingRights;
        chessBoard.enPassantTarget = originalState.enPassantTarget;
        chessBoard.gameState = originalState.gameState;
        
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        
        if (beta <= alpha) {
          break; // Beta cutoff
        }
      }
      
      return maxEval;
    } else {
      let minEval = Infinity;
      
      for (const move of validMoves) {
        // Apply move
        const originalBoard = chessBoard.board.map(row => [...row]);
        const originalState = {
          currentPlayer: chessBoard.currentPlayer,
          castlingRights: JSON.parse(JSON.stringify(chessBoard.castlingRights)),
          enPassantTarget: chessBoard.enPassantTarget,
          gameState: chessBoard.gameState,
        };
        
        chessBoard.makeMove(move);
        
        const evaluation = this.minimax(chessBoard, depth - 1, alpha, beta, true);
        
        // Restore board state
        chessBoard.board = originalBoard;
        chessBoard.currentPlayer = originalState.currentPlayer;
        chessBoard.castlingRights = originalState.castlingRights;
        chessBoard.enPassantTarget = originalState.enPassantTarget;
        chessBoard.gameState = originalState.gameState;
        
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        
        if (beta <= alpha) {
          break; // Alpha cutoff
        }
      }
      
      return minEval;
    }
  }
  
  // Evaluate the current board position
  evaluateBoard(chessBoard) {
    const color = COLORS.WHITE; // Always evaluate relative to white
    
    // Check for checkmate or stalemate
    if (chessBoard.gameState === 'checkmate') {
      return chessBoard.currentPlayer === COLORS.WHITE ? -1000 : 1000;
    }
    
    if (chessBoard.gameState === 'stalemate' || 
        chessBoard.gameState === 'draw_material' || 
        chessBoard.gameState === 'draw_fifty' || 
        chessBoard.gameState === 'draw_repetition') {
      return 0;
    }
    
    // Basic evaluation: material + piece position
    let score = evaluatePosition(chessBoard.board, COLORS.WHITE) - 
                evaluatePosition(chessBoard.board, COLORS.BLACK);
    
    // Check status
    if (chessBoard.isInCheck()) {
      if (chessBoard.currentPlayer === COLORS.WHITE) {
        score -= 5; // White in check, penalty
      } else {
        score += 5; // Black in check, bonus for white
      }
    }
    
    // Mobility (number of moves available)
    const originalPlayer = chessBoard.currentPlayer;
    
    // Count white's moves
    chessBoard.currentPlayer = COLORS.WHITE;
    const whiteMoves = chessBoard.getAllValidMoves().length;
    
    // Count black's moves
    chessBoard.currentPlayer = COLORS.BLACK;
    const blackMoves = chessBoard.getAllValidMoves().length;
    
    // Restore current player
    chessBoard.currentPlayer = originalPlayer;
    
    // Add mobility score (0.1 points per extra move)
    score += (whiteMoves - blackMoves) * 0.1;
    
    return score;
  }
  
  // Get a heuristic value for a move (for move ordering)
  getMoveValue(move) {
    let value = 0;
    
    // Captures are good, prioritize capturing high-value pieces with low-value pieces
    if (move.capturedPiece) {
      const capturingPieceValue = 10; // Default value for all pieces for simplicity
      const capturedPieceValue = PIECE_VALUES[move.capturedPiece.type];
      value += capturedPieceValue - (capturingPieceValue / 10);
    }
    
    // Promotions are good
    if (move.flag === 'p') {
      value += PIECE_VALUES[move.promotion || 'q'] - PIECE_VALUES['p'];
    }
    
    // Castling is good for development and king safety
    if (move.flag === 'k' || move.flag === 'q') {
      value += 5;
    }
    
    return value;
  }
}