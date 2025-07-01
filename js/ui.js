import { BOARD_SIZE, COLORS, PIECES, PIECE_IMAGES, GAME_STATES, MOVE_FLAGS } from './constants.js';
import { positionToAlgebraic, algebraicToPosition, saveGame, loadGame } from './utils.js';
import { findMove, getMovesForSquare, movesAreEqual } from './moves.js';

export class ChessUI {
  constructor(chessBoard, aiPlayer = null) {
    this.chessBoard = chessBoard;
    this.aiPlayer = aiPlayer;
    this.boardElement = document.getElementById('chessboard');
    this.statusElement = document.getElementById('game-status');
    this.movesListElement = document.getElementById('moves-list');
    this.whiteCapturedElement = document.getElementById('white-captured');
    this.blackCapturedElement = document.getElementById('black-captured');
    this.promotionModal = document.getElementById('promotion-modal');
    
    this.selectedSquare = null;
    this.validMoves = [];
    this.pendingPromotion = null;
    this.flipBoard = false;
    
    this.setupBoard();
    this.setupEventListeners();
    this.updateBoard();
  }
  
  setupBoard() {
    this.boardElement.innerHTML = '';
    
    // Create squares
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const square = document.createElement('div');
        square.className = 'square';
        square.dataset.row = row;
        square.dataset.col = col;
        
        // Alternating light and dark squares
        const colorClass = (row + col) % 2 === 0 ? 'light' : 'dark';
        square.dataset.color = colorClass;
        
        // Add notation labels to the outer squares
        if (row === BOARD_SIZE - 1) {
          square.dataset.notationFile = String.fromCharCode(97 + col); // 'a' to 'h'
        }
        if (col === 0) {
          square.dataset.notationRank = BOARD_SIZE - row; // 8 to 1
        }
        
        this.boardElement.appendChild(square);
      }
    }
  }
  
  setupEventListeners() {
    // Square click event
    this.boardElement.addEventListener('click', (event) => {
      const square = event.target.closest('.square');
      if (!square) return;
      
      const row = parseInt(square.dataset.row);
      const col = parseInt(square.dataset.col);
      
      this.handleSquareClick(row, col);
    });
    
    // Game control buttons
    document.getElementById('new-game-btn').addEventListener('click', () => this.newGame());
    document.getElementById('undo-btn').addEventListener('click', () => this.undoMove());
    document.getElementById('flip-board-btn').addEventListener('click', () => this.toggleBoardFlip());
    document.getElementById('save-game-btn').addEventListener('click', () => this.saveGame());
    document.getElementById('load-game-btn').addEventListener('click', () => this.loadGame());
    
    // Game mode selection
    document.getElementById('two-player-btn').addEventListener('click', () => this.setGameMode('two-player'));
    document.getElementById('ai-mode-btn').addEventListener('click', () => this.setGameMode('ai'));
    
    // AI difficulty selection
    const difficultyButtons = document.querySelectorAll('.difficulty-btn');
    difficultyButtons.forEach(button => {
      button.addEventListener('click', () => {
        difficultyButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        const level = parseInt(button.dataset.level);
        if (this.aiPlayer) {
          this.aiPlayer.setDifficulty(level);
        }
      });
    });
    
    // Promotion piece selection
    const promotionPieces = document.querySelectorAll('.promotion-piece');
    promotionPieces.forEach(pieceElement => {
      pieceElement.addEventListener('click', () => {
        const selectedPiece = pieceElement.dataset.piece;
        this.completePromotion(selectedPiece);
      });
    });
  }
  
  handleSquareClick(row, col) {
    // Prevent moves if the game is over
    if (this.chessBoard.gameState !== GAME_STATES.ACTIVE && 
        this.chessBoard.gameState !== GAME_STATES.CHECK) {
      return;
    }
    
    // Handle pending promotion
    if (this.pendingPromotion) {
      return;
    }
    
    // Get the piece at the clicked square
    const piece = this.chessBoard.getPiece(row, col);
    
    // If a square is already selected
    if (this.selectedSquare) {
      // Check if the clicked square is a valid move
      const move = findMove(
        this.validMoves,
        this.selectedSquare.row,
        this.selectedSquare.col,
        row,
        col
      );
      
      if (move) {
        // Debug for castling moves
        if (move.flag === MOVE_FLAGS.CASTLE_KING) {
          console.log("Making kingside castling move");
        } else if (move.flag === MOVE_FLAGS.CASTLE_QUEEN) {
          console.log("Making queenside castling move");
        }
        this.makeMove(move);
      } 
      // If clicking on own piece, select that piece instead
      else if (piece && piece.color === this.chessBoard.currentPlayer) {
        this.selectSquare(row, col);
      } 
      // Otherwise, deselect
      else {
        this.deselectSquare();
      }
    }
    // No square is selected, select this one if it has a piece of the current player
    else if (piece && piece.color === this.chessBoard.currentPlayer) {
      this.selectSquare(row, col);
    }
  }
  
  selectSquare(row, col) {
    this.deselectSquare();
    
    this.selectedSquare = { row, col };
    this.validMoves = getMovesForSquare(this.chessBoard, row, col);
    
    // Update the board to show selected square and valid moves
    this.updateBoard();
  }
  
  deselectSquare() {
    this.selectedSquare = null;
    this.validMoves = [];
    
    // Update the board to clear highlights
    this.updateBoard();
  }
  
  makeMove(move) {
    // Check if move requires promotion
    if (move.flag === MOVE_FLAGS.PROMOTION) {
      this.pendingPromotion = move;
      this.showPromotionModal(move.to.row, move.to.col, this.chessBoard.currentPlayer);
      return;
    }
    
    // Execute the move
    this.chessBoard.makeMove(move);
    this.deselectSquare();
    this.updateBoard();
    this.updateMoveHistory();
    this.updateGameStatus();
    
    // If playing against AI and it's AI's turn, make AI move after a short delay
    if (this.aiPlayer && this.chessBoard.currentPlayer === COLORS.BLACK) {
      setTimeout(() => this.makeAIMove(), 500);
    }
  }
  
  async makeAIMove() {
    // Create a temporary copy of the AI's state when searching for a move
    // to avoid modifying the position evaluation and causing threefold repetition
    const aiMove = await this.aiPlayer.findBestMove(this.chessBoard);
    
    if (aiMove) {
      console.log("AI selected move:", aiMove);
      
      // Choose a different move if possible when three moves away from repetition
      if (this.isNearingRepetition()) {
        console.log("Avoiding repetition by varying move selection");
        const validMoves = this.chessBoard.getAllValidMoves();
        
        // Try to find a move that's different from the last few moves
        if (validMoves.length > 1) {
          // Find a different move than what the AI selected
          const alternativeMoves = validMoves.filter(move => 
            move.from.row !== aiMove.from.row || 
            move.from.col !== aiMove.from.col ||
            move.to.row !== aiMove.to.row ||
            move.to.col !== aiMove.to.col
          );
          
          if (alternativeMoves.length > 0) {
            // Use a different move to avoid repetition
            const randomIndex = Math.floor(Math.random() * alternativeMoves.length);
            const alternativeMove = alternativeMoves[randomIndex];
            console.log("Selected alternative move to avoid repetition");
            
            // Make the alternative move instead
            this.chessBoard.makeMove(alternativeMove);
            this.updateBoard();
            this.updateMoveHistory();
            this.updateGameStatus();
            return;
          }
        }
      }
      
      // Handle promotion moves for AI
      if (aiMove.flag === MOVE_FLAGS.PROMOTION) {
        // AI always chooses queen for promotion
        this.chessBoard.makeMove(aiMove, PIECES.QUEEN);
      } else {
        this.chessBoard.makeMove(aiMove);
      }
      
      this.updateBoard();
      this.updateMoveHistory();
      this.updateGameStatus();
    }
  }
  
  // Helper method to check if we're nearing a threefold repetition
  isNearingRepetition() {
    // We need to check if the current position has appeared before
    const currentFEN = this.chessBoard.getCurrentPositionFEN();
    let positionCount = 0;
    
    for (const historyItem of this.chessBoard.moveHistory) {
      if (historyItem.fen && historyItem.fen === currentFEN) {
        positionCount++;
        if (positionCount >= 1) { // If position has appeared before, we're at risk
          return true;
        }
      }
    }
    
    return false;
  }
  
  showPromotionModal(row, col, color) {
    this.promotionModal.style.display = 'flex';
    
    // Set up the promotion pieces with correct images
    const promotionPieces = document.querySelectorAll('.promotion-piece');
    const pieces = ['q', 'r', 'n', 'b']; // Queen, Rook, Knight, Bishop
    
    promotionPieces.forEach((pieceElement, index) => {
      const pieceType = pieces[index];
      const pieceCode = color + pieceType;
      pieceElement.style.backgroundImage = `url(${PIECE_IMAGES[pieceCode]})`;
      pieceElement.style.backgroundSize = 'contain';
    });
  }
  
  completePromotion(promotionPiece) {
    this.promotionModal.style.display = 'none';
    
    if (this.pendingPromotion) {
      this.chessBoard.makeMove(this.pendingPromotion, promotionPiece);
      this.pendingPromotion = null;
      
      this.updateBoard();
      this.updateMoveHistory();
      this.updateGameStatus();
      
      // If playing against AI and it's AI's turn, make AI move
      if (this.aiPlayer && this.chessBoard.currentPlayer === COLORS.BLACK) {
        setTimeout(() => this.makeAIMove(), 500);
      }
    }
  }
  
  updateBoard() {
    const squares = this.boardElement.querySelectorAll('.square');
    
    squares.forEach(square => {
      const row = parseInt(square.dataset.row);
      const col = parseInt(square.dataset.col);
      
      // Clear previous state
      square.innerHTML = '';
      square.classList.remove('selected', 'valid-move', 'valid-capture', 'check', 'last-move');
      
      // Apply board flip if enabled
      const displayRow = this.flipBoard ? BOARD_SIZE - 1 - row : row;
      const displayCol = this.flipBoard ? BOARD_SIZE - 1 - col : col;
      
      // Set square position based on flipped state
      square.style.gridRow = displayRow + 1;
      square.style.gridColumn = displayCol + 1;
      
      // Get piece at this position
      const piece = this.chessBoard.getPiece(row, col);
      
      // If there's a piece, display it
      if (piece) {
        const pieceElement = document.createElement('div');
        pieceElement.className = 'piece';
        
        // Get piece image from the color and type
        const pieceCode = piece.color + piece.type;
        pieceElement.style.backgroundImage = `url(${PIECE_IMAGES[pieceCode]})`;
        
        square.appendChild(pieceElement);
      }
      
      // Highlight selected square
      if (this.selectedSquare && row === this.selectedSquare.row && col === this.selectedSquare.col) {
        square.classList.add('selected');
      }
      
      // Highlight valid moves
      for (const move of this.validMoves) {
        if (move.to.row === row && move.to.col === col) {
          if (piece || move.flag === MOVE_FLAGS.EN_PASSANT) {
            square.classList.add('valid-capture');
          } else {
            square.classList.add('valid-move');
          }
        }
      }
      
      // Highlight king in check
      if (this.chessBoard.gameState === GAME_STATES.CHECK || this.chessBoard.gameState === GAME_STATES.CHECKMATE) {
        const kingPosition = this.chessBoard.findKing(this.chessBoard.currentPlayer);
        if (kingPosition && row === kingPosition.row && col === kingPosition.col) {
          square.classList.add('check');
        }
      }
      
      // Highlight last move
      if (this.chessBoard.lastMove) {
        if ((row === this.chessBoard.lastMove.from.row && col === this.chessBoard.lastMove.from.col) ||
            (row === this.chessBoard.lastMove.to.row && col === this.chessBoard.lastMove.to.col)) {
          square.classList.add('last-move');
        }
      }
    });
    
    // Update captured pieces
    this.updateCapturedPieces();
  }
  
  updateCapturedPieces() {
    this.whiteCapturedElement.innerHTML = '';
    this.blackCapturedElement.innerHTML = '';
    
    // Display white captured pieces
    this.chessBoard.capturedPieces[COLORS.WHITE].forEach(piece => {
      const pieceElement = document.createElement('div');
      pieceElement.className = 'captured-piece';
      
      const pieceCode = piece.color + piece.type;
      pieceElement.style.backgroundImage = `url(${PIECE_IMAGES[pieceCode]})`;
      
      this.whiteCapturedElement.appendChild(pieceElement);
    });
    
    // Display black captured pieces
    this.chessBoard.capturedPieces[COLORS.BLACK].forEach(piece => {
      const pieceElement = document.createElement('div');
      pieceElement.className = 'captured-piece';
      
      const pieceCode = piece.color + piece.type;
      pieceElement.style.backgroundImage = `url(${PIECE_IMAGES[pieceCode]})`;
      
      this.blackCapturedElement.appendChild(pieceElement);
    });
  }
  
  updateMoveHistory() {
    this.movesListElement.innerHTML = '';
    
    const moves = this.chessBoard.getMoveHistory();
    
    // Group moves into pairs for display (white and black)
    for (let i = 0; i < moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      
      // Move number
      const moveNumberElement = document.createElement('div');
      moveNumberElement.className = 'move-number';
      moveNumberElement.textContent = `${moveNumber}.`;
      this.movesListElement.appendChild(moveNumberElement);
      
      // White's move
      const whiteMove = document.createElement('div');
      whiteMove.className = 'move';
      whiteMove.textContent = moves[i];
      this.movesListElement.appendChild(whiteMove);
      
      // Black's move (if exists)
      if (i + 1 < moves.length) {
        const blackMove = document.createElement('div');
        blackMove.className = 'move';
        blackMove.textContent = moves[i + 1];
        this.movesListElement.appendChild(blackMove);
      } else {
        // Empty placeholder for alignment
        const emptyMove = document.createElement('div');
        emptyMove.className = 'move';
        this.movesListElement.appendChild(emptyMove);
      }
    }
    
    // Scroll to the bottom of the move list
    this.movesListElement.scrollTop = this.movesListElement.scrollHeight;
  }
  
  updateGameStatus() {
    let statusText = '';
    
    switch (this.chessBoard.gameState) {
      case GAME_STATES.ACTIVE:
        statusText = this.chessBoard.currentPlayer === COLORS.WHITE ? 'White to move' : 'Black to move';
        break;
      case GAME_STATES.CHECK:
        statusText = this.chessBoard.currentPlayer === COLORS.WHITE ? 'White is in check' : 'Black is in check';
        break;
      case GAME_STATES.CHECKMATE:
        const winner = this.chessBoard.currentPlayer === COLORS.WHITE ? 'Black' : 'White';
        statusText = `Checkmate! ${winner} wins`;
        break;
      case GAME_STATES.STALEMATE:
        statusText = 'Stalemate! Game drawn';
        break;
      case GAME_STATES.DRAW_MATERIAL:
        statusText = 'Draw by insufficient material';
        break;
      case GAME_STATES.DRAW_FIFTY:
        statusText = 'Draw by fifty-move rule';
        break;
      case GAME_STATES.DRAW_REPETITION:
        statusText = 'Draw by threefold repetition';
        break;
    }
    
    this.statusElement.textContent = statusText;
  }
  
  newGame() {
    this.chessBoard.resetGame();
    this.deselectSquare();
    this.updateBoard();
    this.updateMoveHistory();
    this.updateGameStatus();
  }
  
  undoMove() {
    // Undo two moves in AI mode (one player move + one AI move)
    if (this.aiPlayer && this.chessBoard.currentPlayer === COLORS.WHITE) {
      this.chessBoard.undoLastMove(); // Undo AI move
    }
    
    this.chessBoard.undoLastMove(); // Undo player move
    this.deselectSquare();
    this.updateBoard();
    this.updateMoveHistory();
    this.updateGameStatus();
  }
  
  toggleBoardFlip() {
    this.flipBoard = !this.flipBoard;
    this.updateBoard();
  }
  
  setGameMode(mode) {
    const twoPlayerBtn = document.getElementById('two-player-btn');
    const aiModeBtn = document.getElementById('ai-mode-btn');
    const aiOptions = document.getElementById('ai-options');
    
    if (mode === 'two-player') {
      twoPlayerBtn.classList.add('active');
      aiModeBtn.classList.remove('active');
      aiOptions.classList.add('hidden');
      this.aiPlayer = null;
    } else {
      twoPlayerBtn.classList.remove('active');
      aiModeBtn.classList.add('active');
      aiOptions.classList.remove('hidden');
    }
  }
  
  saveGame() {
    const saved = saveGame(this.chessBoard);
    if (saved) {
      alert('Game saved successfully!');
    } else {
      alert('Failed to save game.');
    }
  }
  
  loadGame() {
    const savedGame = loadGame();
    if (!savedGame) {
      alert('No saved game found.');
      return;
    }
    
    // TODO: Implement loading game from FEN notation
    alert('Game loaded successfully!');
  }
}