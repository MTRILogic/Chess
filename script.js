import { ChessBoard } from './js/board.js';
import { ChessUI } from './js/ui.js';
import { ChessAI } from './js/ai.js';

// Initialize the game when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('Chess game initializing...');
  
  // Create chess board
  const chessBoard = new ChessBoard();
  
  // Create AI player
  const aiPlayer = new ChessAI(2); // Medium difficulty by default
  
  // Create UI controller
  const ui = new ChessUI(chessBoard, null); // Start in two-player mode
  
  // Set up game mode buttons
  document.getElementById('two-player-btn').addEventListener('click', () => {
    ui.aiPlayer = null;
  });
  
  document.getElementById('ai-mode-btn').addEventListener('click', () => {
    ui.aiPlayer = aiPlayer;
  });
  
  // Set up AI difficulty buttons
  const difficultyButtons = document.querySelectorAll('.difficulty-btn');
  difficultyButtons.forEach(button => {
    button.addEventListener('click', () => {
      difficultyButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      const level = parseInt(button.dataset.level);
      aiPlayer.setDifficulty(level);
    });
  });

  // Add keyboard controls for accessibility
  document.addEventListener('keydown', function(event) {
    // Undo with Ctrl+Z
    if (event.key === 'z' && (event.ctrlKey || event.metaKey)) {
      ui.undoMove();
      event.preventDefault();
    }
    
    // New game with Ctrl+N
    if (event.key === 'n' && (event.ctrlKey || event.metaKey)) {
      ui.newGame();
      event.preventDefault();
    }
    
    // Flip board with F key
    if (event.key === 'f') {
      ui.toggleBoardFlip();
      event.preventDefault();
    }
  });
  
  // Sound effects for moves (placeholder)
  const addSoundEffects = () => {
    const moveSound = new Audio('https://chess.com/sounds/move.mp3');
    const captureSound = new Audio('https://chess.com/sounds/capture.mp3');
    const checkSound = new Audio('https://chess.com/sounds/check.mp3');
    
    // These would need to be implemented by subscribing to chess board events
  };
  
  // Initialize game sounds (disabled for now, to be implemented)
  // addSoundEffects();
  
  console.log('Chess game initialized successfully!');
});

// Add responsive design adjustments
window.addEventListener('resize', function() {
  // Auto-adjust the board size based on window dimensions
  const gameContainer = document.querySelector('.game-container');
  const isMobile = window.innerWidth < 768;
  
  if (isMobile) {
    gameContainer.classList.add('mobile-view');
  } else {
    gameContainer.classList.remove('mobile-view');
  }
});

// Add support for drag and drop in the future
const enableDragAndDrop = () => {
  // Implement drag and drop for pieces
  // (This would be a future enhancement)
};

// Welcome message on console
console.log('%cWelcome to Chess Online!', 'color: green; font-weight: bold; font-size: 20px;');
console.log('A complete chess game with all official rules implemented.');