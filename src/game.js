// Game state machine
const State = { SHOWING_WORD: 'showing', CELEBRATING: 'celebrating' };

// Shuffle array in place (Fisher-Yates)
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Color cycle for the active letter highlight
const HIGHLIGHT_COLORS = [
  '#FF6B6B', // coral
  '#4D96FF', // sky blue
  '#6BCB77', // lime green
  '#FFD93D', // sunny yellow
  '#A66CFF', // soft purple
  '#FF8FE0', // pink
  '#FF9F45', // orange
];

class Game {
  constructor() {
    this.wordQueue = [];
    this.currentWord = null;
    this.currentEmoji = null;
    this.cursorPos = 0;
    this.state = State.SHOWING_WORD;
    this.colorIndex = 0;

    // DOM elements
    this.lettersContainer = document.getElementById('letters');
    this.emojiEl = document.getElementById('emoji');
    this.hoorayEl = document.getElementById('hooray');
    this.promptEl = document.getElementById('prompt');
    this.celebrationEl = document.getElementById('celebration');
    this.lastKeyEl = document.getElementById('last-key');
    this.lastKeyTimeout = null;

    // Confetti
    const canvas = document.getElementById('confetti-canvas');
    this.confetti = new ConfettiSystem(canvas);

    // Input
    window.addEventListener('keydown', (e) => this.onKey(e));

    // Start
    this.nextWord();
  }

  refillQueue() {
    this.wordQueue = shuffle([...WORDS]);
  }

  nextWord() {
    if (this.wordQueue.length === 0) this.refillQueue();
    const [word, emoji] = this.wordQueue.pop();
    this.currentWord = word;
    this.currentEmoji = emoji;
    this.cursorPos = 0;
    this.state = State.SHOWING_WORD;
    this.colorIndex = (this.colorIndex + 1) % HIGHLIGHT_COLORS.length;

    // Hide celebration
    this.celebrationEl.classList.remove('visible');
    this.promptEl.classList.remove('visible');

    // Build letter elements
    this.lettersContainer.innerHTML = '';
    for (let i = 0; i < word.length; i++) {
      const span = document.createElement('span');
      span.className = 'letter';
      span.textContent = word[i];
      if (i === 0) {
        span.classList.add('active');
        span.style.color = HIGHLIGHT_COLORS[this.colorIndex];
      }
      this.lettersContainer.appendChild(span);
    }

    // Fade in
    this.lettersContainer.classList.remove('fade-out');
    this.lettersContainer.classList.add('fade-in');
  }

  onKey(e) {
    // Ignore modifier combos, function keys, etc.
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key.length !== 1 && e.key !== ' ') return;

    if (this.state === State.CELEBRATING) {
      if (e.key === ' ') {
        this.nextWord();
      }
      return;
    }

    // SHOWING_WORD state
    const typed = e.key.toUpperCase();
    const target = this.currentWord[this.cursorPos];

    const letters = this.lettersContainer.querySelectorAll('.letter');
    const currentEl = letters[this.cursorPos];

    if (typed === target) {
      // Correct!
      this.showLastKey(typed, true);
      currentEl.classList.remove('active');
      currentEl.classList.add('correct');
      currentEl.style.color = '#4CAF50';

      this.cursorPos++;

      if (this.cursorPos >= this.currentWord.length) {
        // Word complete!
        this.celebrate();
      } else {
        // Highlight next letter
        const nextEl = letters[this.cursorPos];
        this.colorIndex = (this.colorIndex + 1) % HIGHLIGHT_COLORS.length;
        nextEl.classList.add('active');
        nextEl.style.color = HIGHLIGHT_COLORS[this.colorIndex];
      }
    } else {
      // Wrong — wobble + show red key
      this.showLastKey(typed, false);
      currentEl.classList.add('wobble');
      setTimeout(() => currentEl.classList.remove('wobble'), 300);
    }
  }

  showLastKey(letter, correct) {
    // Clear any pending fade-out
    clearTimeout(this.lastKeyTimeout);

    // Reset animation by removing classes and forcing reflow
    this.lastKeyEl.className = '';
    this.lastKeyEl.textContent = letter;
    void this.lastKeyEl.offsetWidth; // force reflow

    this.lastKeyEl.classList.add('show', correct ? 'correct' : 'wrong');

    // Fade out after a moment
    this.lastKeyTimeout = setTimeout(() => {
      this.lastKeyEl.classList.add('fade-out');
    }, 600);
  }

  celebrate() {
    this.state = State.CELEBRATING;

    // Show emoji + hooray
    this.emojiEl.textContent = this.currentEmoji;
    this.celebrationEl.classList.add('visible');

    // Confetti burst from center
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    this.confetti.burst(cx, cy, 70);

    // Second burst slightly delayed for extra fun
    setTimeout(() => {
      this.confetti.burst(cx + (Math.random() - 0.5) * 200, cy - 50, 30);
    }, 300);

    // Show "press space" prompt after a moment
    setTimeout(() => {
      this.promptEl.classList.add('visible');
    }, 1500);
  }
}

// Start the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new Game();
});
