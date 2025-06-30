import { BOARD_SIZE, COLORS, PIECES, MOVE_FLAGS, GAME_STATES } from './constants.js';
import { createPiece } from './pieces.js';
import { isValidPosition, positionToAlgebraic, moveToAlgebraic, cloneBoard, generateFEN } from './utils.js';

export class ChessBoard {
  constructor() {
    this.board = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null));
    this.currentPlayer = COLORS.WHITE;
    this.moveHistory = [];
    this.capturedPieces = { [COLORS.WHITE]: [], [COLORS.BLACK]: [] };
    this.lastMove = null;
    this.gameState = GAME_STATES.ACTIVE;
    this.halfMoveClock = 0;
    this.fullMoveNumber = 1;
    this.enPassantTarget = null;
    
    // For castling rights and fifty-move rule
    this.castlingRights = {
      [COLORS.WHITE]: { kingSide: true, queenSide: true },
      [COLORS.BLACK]: { kingSide: true, queenSide: true }
    };
    
    this.setupInitialPosition();
  }

  // Set up the initial chess position
  setupInitialPosition() {
    // Place pawns
    for (let col = 0; col < BOARD_SIZE; col++) {
      this.board[1][col] = createPiece(PIECES.PAWN, COLORS.BLACK);
      this.board[6][col] = createPiece(PIECES.PAWN, COLORS.WHITE);
    }
    
    // Place rooks
    this.board[0][0] = createPiece(PIECES.ROOK, COLORS.BLACK);
    this.board[0][7] = createPiece(PIECES.ROOK, COLORS.BLACK);
    this.board[7][0] = createPiece(PIECES.ROOK, COLORS.WHITE);
    this.board[7][7] = createPiece(PIECES.ROOK, COLORS.WHITE);
    
    // Place knights
    this.board[0][1] = createPiece(PIECES.KNIGHT, COLORS.BLACK);
    this.board[0][6] = createPiece(PIECES.KNIGHT, COLORS.BLACK);
    this.board[7][1] = createPiece(PIECES.KNIGHT, COLORS.WHITE);
    this.board[7][6] = createPiece(PIECES.KNIGHT, COLORS.WHITE);
    
    // Place bishops
    this.board[0][2] = createPiece(PIECES.BISHOP, COLORS.BLACK);
    this.board[0][5] = createPiece(PIECES.BISHOP, COLORS.BLACK);
    this.board[7][2] = createPiece(PIECES.BISHOP, COLORS.WHITE);
    this.board[7][5] = createPiece(PIECES.BISHOP, COLORS.WHITE);
    
    // Place queens
    this.board[0][3] = createPiece(PIECES.QUEEN, COLORS.BLACK);
    this.board[7][3] = createPiece(PIECES.QUEEN, COLORS.WHITE);
    
    // Place kings
    this.board[0][4] = createPiece(PIECES.KING, COLORS.BLACK);
    this.board[7][4] = createPiece(PIECES.KING, COLORS.WHITE);
  }

  // Get the piece at a specific position
  getPiece(row, col) {
    if (isValidPosition(row, col)) {
      return this.board[row][col];
    }
    return null;
  }

  // Get all valid moves for the current player
  getAllValidMoves() {
    const allMoves = [];
    
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = this.board[row][col];
        if (piece && piece.color === this.currentPlayer) {
          const pieceMoves = this.getValidMovesForPiece(row, col);
          allMoves.push(...pieceMoves);
        }
      }
    }
    
    // Filter out moves that would leave the king in check
    return allMoves.filter(move => !this.wouldBeInCheckAfterMove(move));
  }
  
  // Get valid moves for a specific piece at position
  getValidMovesForPiece(row, col) {
    const piece = this.board[row][col];
    if (!piece) return [];
    
    let moves = piece.getValidMoves(this.board, { row, col });
    
    // Add en passant moves for pawns
    if (piece.type === PIECES.PAWN && this.enPassantTarget) {
      const enPassantRow = this.currentPlayer === COLORS.WHITE ? 3 : 4;
      const direction = this.currentPlayer === COLORS.WHITE ? -1 : 1;
      
      if (row === enPassantRow && 
          Math.abs(col - this.enPassantTarget.col) === 1) {
        moves.push({
          from: { row, col },
          to: { row: row + direction, col: this.enPassantTarget.col },
          flag: MOVE_FLAGS.EN_PASSANT,
          capturedPiece: this.board[row][this.enPassantTarget.col]
        });
      }
    }

    return moves;
  }

  // Check if a move would leave the king in check
  wouldBeInCheckAfterMove(move) {
    // Make a deep copy of the current board state
    const tempBoard = this.board.map(row => [...row]);
    
    // Apply the move temporarily
    const fromPiece = tempBoard[move.from.row][move.from.col];
    tempBoard[move.from.row][move.from.col] = null;
    
    // Handle en passant capture
    if (move.flag === MOVE_FLAGS.EN_PASSANT) {
      const captureRow = move.from.row;
      tempBoard[captureRow][move.to.col] = null;
    }
    
    // Handle normal move or capture
    tempBoard[move.to.row][move.to.col] = fromPiece;
    
    // Find the king's position after the move
    let kingRow = -1, kingCol = -1;
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = tempBoard[row][col];
        if (piece && piece.type === PIECES.KING && piece.color === this.currentPlayer) {
          kingRow = row;
          kingCol = col;
          break;
        }
      }
      if (kingRow !== -1) break;
    }
    
    // Check if the king is in check after the move
    return this.isPositionAttacked(tempBoard, kingRow, kingCol, this.currentPlayer);
  }

  // Check if a position is attacked by any opponent piece
  isPositionAttacked(board, row, col, defendingColor) {
    const attackingColor = defendingColor === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    
    // Check for attacks by pawns
    const pawnDirection = defendingColor === COLORS.WHITE ? 1 : -1;
    const pawnAttackCols = [col - 1, col + 1];
    for (const attackCol of pawnAttackCols) {
      const attackRow = row + pawnDirection;
      if (isValidPosition(attackRow, attackCol)) {
        const piece = board[attackRow][attackCol];
        if (piece && piece.type === PIECES.PAWN && piece.color === attackingColor) {
          return true;
        }
      }
    }
    
    // Check for attacks by knights
    const knightMoves = [
      { row: row + 2, col: col + 1 },
      { row: row + 2, col: col - 1 },
      { row: row - 2, col: col + 1 },
      { row: row - 2, col: col - 1 },
      { row: row + 1, col: col + 2 },
      { row: row + 1, col: col - 2 },
      { row: row - 1, col: col + 2 },
      { row: row - 1, col: col - 2 }
    ];
    
    for (const move of knightMoves) {
      if (isValidPosition(move.row, move.col)) {
        const piece = board[move.row][move.col];
        if (piece && piece.type === PIECES.KNIGHT && piece.color === attackingColor) {
          return true;
        }
      }
    }
    
    // Check for attacks along diagonals (bishop, queen)
    const diagonalDirections = [
      { dRow: 1, dCol: 1 },
      { dRow: 1, dCol: -1 },
      { dRow: -1, dCol: 1 },
      { dRow: -1, dCol: -1 }
    ];
    
    for (const direction of diagonalDirections) {
      let distance = 1;
      while (true) {
        const checkRow = row + direction.dRow * distance;
        const checkCol = col + direction.dCol * distance;
        
        if (!isValidPosition(checkRow, checkCol)) break;
        
        const piece = board[checkRow][checkCol];
        if (piece) {
          if (piece.color === attackingColor && 
              (piece.type === PIECES.BISHOP || piece.type === PIECES.QUEEN)) {
            return true;
          }
          break; // Blocked by some piece
        }
        
        distance++;
      }
    }
    
    // Check for attacks along ranks and files (rook, queen)
    const straightDirections = [
      { dRow: 0, dCol: 1 },
      { dRow: 1, dCol: 0 },
      { dRow: 0, dCol: -1 },
      { dRow: -1, dCol: 0 }
    ];
    
    for (const direction of straightDirections) {
      let distance = 1;
      while (true) {
        const checkRow = row + direction.dRow * distance;
        const checkCol = col + direction.dCol * distance;
        
        if (!isValidPosition(checkRow, checkCol)) break;
        
        const piece = board[checkRow][checkCol];
        if (piece) {
          if (piece.color === attackingColor && 
              (piece.type === PIECES.ROOK || piece.type === PIECES.QUEEN)) {
            return true;
          }
          break; // Blocked by some piece
        }
        
        distance++;
      }
    }
    
    // Check for attacks by enemy king (1 square away)
    const kingMoves = [
      { row: row + 1, col: col },
      { row: row - 1, col: col },
      { row: row, col: col + 1 },
      { row: row, col: col - 1 },
      { row: row + 1, col: col + 1 },
      { row: row + 1, col: col - 1 },
      { row: row - 1, col: col + 1 },
      { row: row - 1, col: col - 1 }
    ];
    
    for (const move of kingMoves) {
      if (isValidPosition(move.row, move.col)) {
        const piece = board[move.row][move.col];
        if (piece && piece.type === PIECES.KING && piece.color === attackingColor) {
          return true;
        }
      }
    }
    
    return false;
  }

  // Find the king's position for a specific color
  findKing(color) {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = this.board[row][col];
        if (piece && piece.type === PIECES.KING && piece.color === color) {
          return { row, col };
        }
      }
    }
    return null;
  }

  // Check if the current player is in check
  isInCheck() {
    const kingPosition = this.findKing(this.currentPlayer);
    return this.isPositionAttacked(this.board, kingPosition.row, kingPosition.col, this.currentPlayer);
  }
  
  // Check if the current player is in checkmate
  isInCheckmate() {
    // If not in check, then not in checkmate
    if (!this.isInCheck()) {
      return false;
    }
    
    // If in check and no valid moves, then checkmate
    return this.getAllValidMoves().length === 0;
  }
  
  // Check if the current position is a stalemate
  isInStalemate() {
    // If in check, then not a stalemate
    if (this.isInCheck()) {
      return false;
    }
    
    // If not in check but no valid moves, then stalemate
    return this.getAllValidMoves().length === 0;
  }

  // Check for draw by insufficient material
  isInsufficientMaterial() {
    let pieces = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = this.board[row][col];
        if (piece && piece.type !== PIECES.KING) {
          pieces.push(piece);
        }
      }
    }
    
    // King vs king
    if (pieces.length === 0) {
      return true;
    }
    
    // King + bishop/knight vs king
    if (pieces.length === 1 && (pieces[0].type === PIECES.BISHOP || pieces[0].type === PIECES.KNIGHT)) {
      return true;
    }
    
    // King + bishop vs king + bishop (same color bishops)
    if (pieces.length === 2 && 
        pieces[0].type === PIECES.BISHOP && pieces[1].type === PIECES.BISHOP) {
      // Check if bishops are on the same color squares
      const bishop1Pos = this.findPiecePosition(pieces[0]);
      const bishop2Pos = this.findPiecePosition(pieces[1]);
      const bishop1OnLight = (bishop1Pos.row + bishop1Pos.col) % 2 === 0;
      const bishop2OnLight = (bishop2Pos.row + bishop2Pos.col) % 2 === 0;
      
      return bishop1OnLight === bishop2OnLight;
    }
    
    return false;
  }
  
  // Helper method to find a piece's position
  findPiecePosition(targetPiece) {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = this.board[row][col];
        if (piece === targetPiece) {
          return { row, col };
        }
      }
    }
    return null;
  }
  
  // Check for draw by the fifty-move rule
  isFiftyMoveRule() {
    return this.halfMoveClock >= 100; // 50 moves by each player = 100 half moves
  }
  
  // Check for draw by threefold repetition
  isThreefoldRepetition() {
    const currentFEN = this.getCurrentPositionFEN();
    let count = 1; // Current position already counts as 1
    
    for (const historyItem of this.moveHistory) {
      if (historyItem.fen && historyItem.fen === currentFEN) {
        count++;
        if (count >= 3) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  // Get the current position in FEN notation (without move counters)
  getCurrentPositionFEN() {
    const fenParts = this.getFEN().split(' ');
    // Return just the position, active color, castling rights and en passant target
    return fenParts.slice(0, 4).join(' ');
  }
  
  // Get the complete FEN representation of the current position
  getFEN() {
    // Generate castling rights string
    let castlingStr = '';
    if (this.castlingRights[COLORS.WHITE].kingSide) castlingStr += 'K';
    if (this.castlingRights[COLORS.WHITE].queenSide) castlingStr += 'Q';
    if (this.castlingRights[COLORS.BLACK].kingSide) castlingStr += 'k';
    if (this.castlingRights[COLORS.BLACK].queenSide) castlingStr += 'q';
    if (castlingStr === '') castlingStr = '-';
    
    // Generate en passant target square
    let epSquare = '-';
    if (this.enPassantTarget) {
      epSquare = positionToAlgebraic(this.enPassantTarget);
    }
    
    return generateFEN(
      this.board, 
      this.currentPlayer, 
      castlingStr, 
      epSquare,
      this.halfMoveClock, 
      this.fullMoveNumber
    );
  }
  
  // Update the game state
  updateGameState() {
    if (this.isInCheckmate()) {
      this.gameState = GAME_STATES.CHECKMATE;
      return;
    }
    
    if (this.isInCheck()) {
      this.gameState = GAME_STATES.CHECK;
      return;
    }
    
    if (this.isInStalemate()) {
      this.gameState = GAME_STATES.STALEMATE;
      return;
    }
    
    if (this.isInsufficientMaterial()) {
      this.gameState = GAME_STATES.DRAW_MATERIAL;
      return;
    }
    
    if (this.isFiftyMoveRule()) {
      this.gameState = GAME_STATES.DRAW_FIFTY;
      return;
    }
    
    if (this.isThreefoldRepetition()) {
      this.gameState = GAME_STATES.DRAW_REPETITION;
      return;
    }
    
    this.gameState = GAME_STATES.ACTIVE;
  }

  // Make a move on the board
  makeMove(move, promotionPiece = PIECES.QUEEN) {
    const { from, to, flag } = move;
    const piece = this.board[from.row][from.col];
    
    if (!piece) return false;
    
    // Store the current position in FEN before making the move
    const preMovePosition = this.getCurrentPositionFEN();
    
    // Reset en passant target
    this.enPassantTarget = null;
    
    // Update halfmove clock for 50-move rule
    if (piece.type === PIECES.PAWN || flag === MOVE_FLAGS.CAPTURE || flag === MOVE_FLAGS.EN_PASSANT) {
      this.halfMoveClock = 0; // Reset on pawn move or capture
    } else {
      this.halfMoveClock++;
    }
    
    // Handle captures
    let capturedPiece = null;
    if (flag === MOVE_FLAGS.CAPTURE) {
      capturedPiece = this.board[to.row][to.col];
      this.capturedPieces[capturedPiece.color].push(capturedPiece);
    }
    
    // Handle en passant capture
    if (flag === MOVE_FLAGS.EN_PASSANT) {
      const captureRow = from.row;
      capturedPiece = this.board[captureRow][to.col];
      this.board[captureRow][to.col] = null;
      this.capturedPieces[capturedPiece.color].push(capturedPiece);
    }
    
    // Handle castling
    if (flag === MOVE_FLAGS.CASTLE_KING) {
      // Move the king
      this.board[to.row][to.col] = piece;
      this.board[from.row][from.col] = null;
      
      // Move the rook (kingside)
      const rookFromCol = 7;
      const rookToCol = to.col - 1; // Place the rook to the left of the king
      const rook = this.board[to.row][rookFromCol];
      this.board[to.row][rookToCol] = rook;
      this.board[to.row][rookFromCol] = null;
      
      if (rook) rook.hasMoved = true;
    } 
    else if (flag === MOVE_FLAGS.CASTLE_QUEEN) {
      // Move the king
      this.board[to.row][to.col] = piece;
      this.board[from.row][from.col] = null;
      
      // Move the rook (queenside)
      const rookFromCol = 0;
      const rookToCol = to.col + 1; // Place the rook to the right of the king
      const rook = this.board[to.row][rookFromCol];
      this.board[to.row][rookToCol] = rook;
      this.board[to.row][rookFromCol] = null;
      
      if (rook) rook.hasMoved = true;
    }
    // Handle pawn promotion
    else if (flag === MOVE_FLAGS.PROMOTION) {
      const newPiece = createPiece(promotionPiece, piece.color);
      this.board[to.row][to.col] = newPiece;
      this.board[from.row][from.col] = null;
    }
    // Handle normal move
    else {
      this.board[to.row][to.col] = piece;
      this.board[from.row][from.col] = null;
      
      // Set en passant target if double pawn push
      if (flag === MOVE_FLAGS.DOUBLE_PAWN_PUSH) {
        const enPassantRow = (from.row + to.row) / 2; // Middle row between from and to
        this.enPassantTarget = { row: enPassantRow, col: to.col };
      }
    }
    
    // Update castling rights
    if (piece.type === PIECES.KING) {
      this.castlingRights[piece.color].kingSide = false;
      this.castlingRights[piece.color].queenSide = false;
    }
    else if (piece.type === PIECES.ROOK) {
      if (from.col === 0) { // Queenside rook
        this.castlingRights[piece.color].queenSide = false;
      }
      else if (from.col === 7) { // Kingside rook
        this.castlingRights[piece.color].kingSide = false;
      }
    }
    
    // Mark the piece as moved
    piece.hasMoved = true;
    
    // Update move history
    const moveNotation = moveToAlgebraic(move, this.board);
    this.moveHistory.push({
      from,
      to,
      piece,
      flag,
      capturedPiece,
      promotionPiece,
      notation: moveNotation,
      fen: preMovePosition
    });
    
    this.lastMove = move;
    
    // Switch player
    this.currentPlayer = this.currentPlayer === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    
    // Update full move number
    if (this.currentPlayer === COLORS.WHITE) {
      this.fullMoveNumber++;
    }
    
    // Update game state
    this.updateGameState();
    
    return true;
  }
  
  // Undo the last move
  undoLastMove() {
    if (this.moveHistory.length === 0) return false;
    
    const lastMove = this.moveHistory.pop();
    const { from, to, piece, flag, capturedPiece } = lastMove;
    
    // Switch player back
    this.currentPlayer = this.currentPlayer === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    
    // Update full move number
    if (this.currentPlayer === COLORS.BLACK) {
      this.fullMoveNumber--;
    }
    
    // Restore the moved piece
    this.board[from.row][from.col] = piece;
    
    // Handle castling
    if (flag === MOVE_FLAGS.CASTLE_KING) {
      // Restore king
      this.board[to.row][to.col] = null;
      
      // Restore rook (kingside)
      const rookFromCol = to.col - 1;
      const rookToCol = 7;
      const rook = this.board[to.row][rookFromCol];
      this.board[to.row][rookToCol] = rook;
      this.board[to.row][rookFromCol] = null;
      
      if (rook) rook.hasMoved = false;
      piece.hasMoved = false;
    } 
    else if (flag === MOVE_FLAGS.CASTLE_QUEEN) {
      // Restore king
      this.board[to.row][to.col] = null;
      
      // Restore rook (queenside)
      const rookFromCol = to.col + 1;
      const rookToCol = 0;
      const rook = this.board[to.row][rookFromCol];
      this.board[to.row][rookToCol] = rook;
      this.board[to.row][rookFromCol] = null;
      
      if (rook) rook.hasMoved = false;
      piece.hasMoved = false;
    }
    // Handle en passant
    else if (flag === MOVE_FLAGS.EN_PASSANT) {
      this.board[to.row][to.col] = null;
      const captureRow = from.row;
      this.board[captureRow][to.col] = capturedPiece;
      
      // Remove from captured pieces
      if (capturedPiece) {
        const index = this.capturedPieces[capturedPiece.color].indexOf(capturedPiece);
        if (index !== -1) {
          this.capturedPieces[capturedPiece.color].splice(index, 1);
        }
      }
    }
    // Handle normal move or promotion
    else {
      this.board[to.row][to.col] = capturedPiece;
      
      // Remove from captured pieces
      if (capturedPiece) {
        const index = this.capturedPieces[capturedPiece.color].indexOf(capturedPiece);
        if (index !== -1) {
          this.capturedPieces[capturedPiece.color].splice(index, 1);
        }
      }
    }
    
    // Restore piece's moved status if this was its first move
    if (this.moveHistory.length === 0 || 
        this.moveHistory.every(move => move.piece !== piece)) {
      piece.hasMoved = false;
    }
    
    // Restore castling rights from previous position
    if (this.moveHistory.length > 0) {
      const previousFEN = this.moveHistory[this.moveHistory.length - 1].fen;
      const castlingRights = previousFEN.split(' ')[2];
      
      this.castlingRights = {
        [COLORS.WHITE]: { 
          kingSide: castlingRights.includes('K'), 
          queenSide: castlingRights.includes('Q') 
        },
        [COLORS.BLACK]: { 
          kingSide: castlingRights.includes('k'), 
          queenSide: castlingRights.includes('q') 
        }
      };
      
      // Restore en passant target
      const epSquare = previousFEN.split(' ')[3];
      if (epSquare !== '-') {
        const pos = algebraicToPosition(epSquare);
        this.enPassantTarget = pos;
      } else {
        this.enPassantTarget = null;
      }
      
      // Restore halfmove clock
      this.halfMoveClock = parseInt(previousFEN.split(' ')[4]);
    } else {
      // If we're back to the initial position
      this.castlingRights = {
        [COLORS.WHITE]: { kingSide: true, queenSide: true },
        [COLORS.BLACK]: { kingSide: true, queenSide: true }
      };
      this.enPassantTarget = null;
      this.halfMoveClock = 0;
    }
    
    // Get the move before last move
    this.lastMove = this.moveHistory.length > 0 ? 
      { from: this.moveHistory[this.moveHistory.length - 1].from, to: this.moveHistory[this.moveHistory.length - 1].to } : 
      null;
    
    // Update game state
    this.updateGameState();
    
    return true;
  }
  
  // Get move history in algebraic notation
  getMoveHistory() {
    return this.moveHistory.map(move => move.notation);
  }
  
  // Reset the game to the initial state
  resetGame() {
    this.board = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null));
    this.setupInitialPosition();
    this.currentPlayer = COLORS.WHITE;
    this.moveHistory = [];
    this.capturedPieces = { [COLORS.WHITE]: [], [COLORS.BLACK]: [] };
    this.lastMove = null;
    this.gameState = GAME_STATES.ACTIVE;
    this.halfMoveClock = 0;
    this.fullMoveNumber = 1;
    this.enPassantTarget = null;
    this.castlingRights = {
      [COLORS.WHITE]: { kingSide: true, queenSide: true },
      [COLORS.BLACK]: { kingSide: true, queenSide: true }
    };
  }
}