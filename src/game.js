// Game state machine
const State = {
  MENU: 'menu',
  SHOWING_WORD: 'showing',
  CELEBRATING: 'celebrating',
  SETTINGS: 'settings',
  SUMMARY: 'summary',
};

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
  '#FF6B6B', '#4D96FF', '#6BCB77', '#FFD93D',
  '#A66CFF', '#FF8FE0', '#FF9F45',
];

// Random critter emojis for start screen decoration
const MENU_CRITTERS = ['\u{1F431}', '\u{1F436}', '\u{1F438}', '\u{1F430}', '\u{1F43C}', '\u{1F981}', '\u{1F42D}', '\u{1F986}'];

class Game {
  constructor() {
    this.wordQueue = [];
    this.currentWord = null;
    this.currentEmoji = null;
    this.cursorPos = 0;
    this.state = State.MENU;
    this.colorIndex = 0;
    this.collectedCritters = [];
    this.wordsCompleted = 0;

    // Settings (load from localStorage)
    this.settings = this.loadSettings();

    // Sound
    this.sounds = new SoundFX();
    this.sounds.muted = !this.settings.sound;

    // DOM elements
    this.startScreen = document.getElementById('start-screen');
    this.startEmojis = document.getElementById('start-emojis');
    this.playBtn = document.getElementById('play-btn');
    this.gameArea = document.getElementById('game-area');
    this.lettersContainer = document.getElementById('letters');
    this.emojiEl = document.getElementById('emoji');
    this.hoorayEl = document.getElementById('hooray');
    this.promptEl = document.getElementById('prompt');
    this.celebrationEl = document.getElementById('celebration');
    this.lastKeyEl = document.getElementById('last-key');
    this.lastKeyTimeout = null;
    this.paradeEl = document.getElementById('critter-parade');
    this.idleNudge = document.getElementById('idle-nudge');
    this.settingsGear = document.getElementById('settings-gear');
    this.settingsPanel = document.getElementById('settings-panel');
    this.summaryOverlay = document.getElementById('summary-overlay');
    this.summaryCount = document.getElementById('summary-count');
    this.summaryCritters = document.getElementById('summary-critters');

    // Settings controls
    this.settingLength = document.getElementById('setting-length');
    this.settingCategory = document.getElementById('setting-category');
    this.settingUppercase = document.getElementById('setting-uppercase');
    this.settingSound = document.getElementById('setting-sound');
    this.settingsCloseBtn = document.getElementById('settings-close');

    // Confetti
    const canvas = document.getElementById('confetti-canvas');
    this.confetti = new ConfettiSystem(canvas);

    // Idle timer
    this.idleTimer = null;
    this.IDLE_TIMEOUT = 30000; // 30 seconds

    // Settings gear long-press
    this.gearHoldTimer = null;
    this.GEAR_HOLD_MS = 1000;

    this.bindEvents();
    this.applySettings();
    this.showMenu();

    // Reposition last-key on resize
    window.addEventListener('resize', () => this.positionLastKey());

    // Electron IPC: handle Escape from main process
    if (window.electronAPI) {
      window.electronAPI.onEscapePressed(() => this.handleEscape());
    }
  }

  // ===== SETTINGS =====

  loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem('typeCrittersSettings'));
      if (saved) return { length: 'all', category: 'all', uppercase: true, sound: true, ...saved };
    } catch (e) { /* ignore */ }
    return { length: 'all', category: 'all', uppercase: true, sound: true };
  }

  saveSettings() {
    localStorage.setItem('typeCrittersSettings', JSON.stringify(this.settings));
  }

  applySettings() {
    this.settingLength.value = this.settings.length;
    this.settingCategory.value = this.settings.category;
    this.settingUppercase.checked = this.settings.uppercase;
    this.settingSound.checked = this.settings.sound;
    this.sounds.muted = !this.settings.sound;
  }

  readSettingsFromUI() {
    this.settings.length = this.settingLength.value;
    this.settings.category = this.settingCategory.value;
    this.settings.uppercase = this.settingUppercase.checked;
    this.settings.sound = this.settingSound.checked;
    this.sounds.muted = !this.settings.sound;
    this.saveSettings();
  }

  getFilteredWords() {
    let filtered = WORDS;

    if (this.settings.category !== 'all') {
      filtered = filtered.filter(([, , cat]) => cat === this.settings.category);
    }

    if (this.settings.length !== 'all') {
      const ranges = { short: [2, 3], medium: [4, 4], long: [5, 99] };
      const [min, max] = ranges[this.settings.length];
      filtered = filtered.filter(([word]) => word.length >= min && word.length <= max);
    }

    // Fallback: if filters eliminate everything, use all words
    return filtered.length > 0 ? filtered : WORDS;
  }

  // ===== EVENT BINDING =====

  bindEvents() {
    // Keyboard
    window.addEventListener('keydown', (e) => this.onKey(e));

    // Play button
    this.playBtn.addEventListener('click', () => {
      this.sounds.click();
      this.startGame();
    });

    // Settings gear — long press to open
    this.settingsGear.addEventListener('mousedown', () => this.startGearHold());
    this.settingsGear.addEventListener('touchstart', (e) => { e.preventDefault(); this.startGearHold(); });
    this.settingsGear.addEventListener('mouseup', () => this.cancelGearHold());
    this.settingsGear.addEventListener('mouseleave', () => this.cancelGearHold());
    this.settingsGear.addEventListener('touchend', () => this.cancelGearHold());
    this.settingsGear.addEventListener('touchcancel', () => this.cancelGearHold());

    // Settings close
    this.settingsCloseBtn.addEventListener('click', () => this.closeSettings());

    // Click backdrop to close settings
    this.settingsPanel.addEventListener('click', (e) => {
      if (e.target === this.settingsPanel) this.closeSettings();
    });
  }

  startGearHold() {
    this.settingsGear.classList.add('holding');
    this.gearHoldTimer = setTimeout(() => {
      this.settingsGear.classList.remove('holding');
      this.openSettings();
    }, this.GEAR_HOLD_MS);
  }

  cancelGearHold() {
    this.settingsGear.classList.remove('holding');
    clearTimeout(this.gearHoldTimer);
  }

  // ===== MENU =====

  showMenu() {
    this.state = State.MENU;
    this.startScreen.classList.remove('hidden');
    this.gameArea.classList.add('hidden');
    this.summaryOverlay.classList.add('hidden');
    this.paradeEl.innerHTML = '';
    this.collectedCritters = [];
    this.wordsCompleted = 0;
    this.clearIdleTimer();

    // Populate bouncing critter emojis
    this.startEmojis.innerHTML = '';
    const critters = shuffle([...MENU_CRITTERS]).slice(0, 5);
    critters.forEach((em, i) => {
      const span = document.createElement('span');
      span.textContent = em;
      span.style.setProperty('--bob-delay', `${i * 0.3}s`);
      span.style.setProperty('--bob-duration', `${1.8 + Math.random() * 0.6}s`);
      this.startEmojis.appendChild(span);
    });
  }

  startGame() {
    this.startScreen.classList.add('hidden');
    this.gameArea.classList.remove('hidden');
    this.wordQueue = [];
    this.nextWord();
  }

  // ===== SETTINGS =====

  openSettings() {
    this.previousState = this.state;
    this.state = State.SETTINGS;
    this.settingsPanel.classList.add('visible');
    this.sounds.click();
    this.clearIdleTimer();
  }

  closeSettings() {
    this.readSettingsFromUI();
    this.settingsPanel.classList.remove('visible');
    this.state = this.previousState || State.MENU;
    this.sounds.click();

    // Release focus from settings controls so keydown reaches the game
    document.activeElement.blur();

    // If we're mid-game, rebuild the current word with new case setting
    if (this.state === State.SHOWING_WORD) {
      this.rebuildCurrentWord();
      this.resetIdleTimer();
    }
  }

  // ===== WORD MANAGEMENT =====

  refillQueue() {
    this.wordQueue = shuffle([...this.getFilteredWords()]);
  }

  formatLetter(ch) {
    return this.settings.uppercase ? ch : ch.toLowerCase();
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
    this.hideIdleNudge();

    // Build letter elements
    this.lettersContainer.innerHTML = '';
    for (let i = 0; i < word.length; i++) {
      const span = document.createElement('span');
      span.className = 'letter';
      span.textContent = this.formatLetter(word[i]);
      if (i === 0) {
        span.classList.add('active');
        span.style.color = HIGHLIGHT_COLORS[this.colorIndex];
      }
      this.lettersContainer.appendChild(span);
    }

    // Fade in
    this.lettersContainer.classList.remove('fade-out');
    this.lettersContainer.classList.add('fade-in');

    this.resetIdleTimer();
  }

  rebuildCurrentWord() {
    if (!this.currentWord) return;
    const letters = this.lettersContainer.querySelectorAll('.letter');
    for (let i = 0; i < letters.length; i++) {
      letters[i].textContent = this.formatLetter(this.currentWord[i]);
    }
  }

  // ===== INPUT =====

  onKey(e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    // Escape handling — use dedicated method
    if (e.key === 'Escape') {
      this.handleEscape();
      return;
    }

    // Menu: Space or Enter to start
    if (this.state === State.MENU) {
      if (e.key === ' ' || e.key === 'Enter') {
        this.sounds.click();
        this.startGame();
      }
      return;
    }

    // Settings: ignore game keys
    if (this.state === State.SETTINGS || this.state === State.SUMMARY) return;

    if (e.key.length !== 1 && e.key !== ' ') return;

    if (this.state === State.CELEBRATING) {
      if (e.key === ' ') {
        this.nextWord();
      }
      return;
    }

    // SHOWING_WORD state
    this.resetIdleTimer();
    this.hideIdleNudge();

    const typed = e.key.toUpperCase();
    const target = this.currentWord[this.cursorPos];

    const letters = this.lettersContainer.querySelectorAll('.letter');
    const currentEl = letters[this.cursorPos];

    if (typed === target) {
      // Correct!
      this.sounds.pop();
      this.showLastKey(this.formatLetter(typed), true);
      currentEl.classList.remove('active');
      currentEl.classList.add('correct');
      currentEl.style.color = '#4CAF50';

      this.cursorPos++;

      if (this.cursorPos >= this.currentWord.length) {
        this.celebrate();
      } else {
        const nextEl = letters[this.cursorPos];
        this.colorIndex = (this.colorIndex + 1) % HIGHLIGHT_COLORS.length;
        nextEl.classList.add('active');
        nextEl.style.color = HIGHLIGHT_COLORS[this.colorIndex];
      }
    } else {
      // Wrong
      this.sounds.boop();
      this.showLastKey(this.formatLetter(typed), false);
      currentEl.classList.add('wobble');
      setTimeout(() => currentEl.classList.remove('wobble'), 300);
    }
  }

  positionLastKey() {
    // Find the gap between the prompt bottom and the critter parade top
    const promptRect = this.promptEl.getBoundingClientRect();
    const paradeRect = this.paradeEl.getBoundingClientRect();

    const gapTop = promptRect.bottom;
    const gapBottom = paradeRect.top > 0 ? paradeRect.top : window.innerHeight - 12;
    const gap = gapBottom - gapTop;

    // Max font size matches the CSS clamp max (160px), scale down if gap is tight
    const maxSize = Math.min(160, window.innerWidth * 0.12);
    // Leave some breathing room — letter shouldn't fill more than ~70% of the gap
    const fittedSize = Math.min(maxSize, gap * 0.7);
    const fontSize = Math.max(40, fittedSize);

    this.lastKeyEl.style.fontSize = `${fontSize}px`;
    // Center vertically in the gap
    this.lastKeyEl.style.top = `${gapTop + (gap - fontSize) / 2}px`;
  }

  showLastKey(letter, correct) {
    clearTimeout(this.lastKeyTimeout);
    this.lastKeyEl.className = '';
    this.lastKeyEl.textContent = letter;
    this.positionLastKey();
    void this.lastKeyEl.offsetWidth;
    this.lastKeyEl.classList.add('show', correct ? 'correct' : 'wrong');
    this.lastKeyTimeout = setTimeout(() => {
      this.lastKeyEl.classList.add('fade-out');
    }, 600);
  }

  // ===== CELEBRATION =====

  celebrate() {
    this.state = State.CELEBRATING;
    this.wordsCompleted++;
    this.clearIdleTimer();

    // Add critter to parade
    this.addCritter(this.currentEmoji);

    // Sound
    this.sounds.fanfare();

    // Show emoji + hooray
    this.emojiEl.textContent = this.currentEmoji;
    this.celebrationEl.classList.add('visible');

    // Confetti
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    this.confetti.burst(cx, cy, 70);
    setTimeout(() => {
      this.confetti.burst(cx + (Math.random() - 0.5) * 200, cy - 50, 30);
    }, 300);

    // Show prompt after a moment
    setTimeout(() => {
      this.promptEl.classList.add('visible');
    }, 1500);
  }

  // ===== CRITTER PARADE =====

  addCritter(emoji) {
    this.collectedCritters.push(emoji);
    const span = document.createElement('span');
    span.className = 'critter';
    span.textContent = emoji;
    this.paradeEl.appendChild(span);
  }

  // ===== IDLE NUDGE =====

  resetIdleTimer() {
    this.clearIdleTimer();
    if (this.state === State.SHOWING_WORD) {
      this.idleTimer = setTimeout(() => this.showIdleNudge(), this.IDLE_TIMEOUT);
    }
  }

  clearIdleTimer() {
    clearTimeout(this.idleTimer);
  }

  showIdleNudge() {
    if (this.state !== State.SHOWING_WORD) return;

    const letters = this.lettersContainer.querySelectorAll('.letter');
    const activeEl = letters[this.cursorPos];
    if (!activeEl) return;

    const rect = activeEl.getBoundingClientRect();
    this.idleNudge.style.left = `${rect.left - 60}px`;
    this.idleNudge.style.top = `${rect.top + rect.height / 2 - 30}px`;
    this.idleNudge.classList.add('visible');
  }

  hideIdleNudge() {
    this.idleNudge.classList.remove('visible');
  }

  // ===== ESCAPE / QUIT =====

  handleEscape() {
    if (this.state === State.SUMMARY) {
      // Second escape: quit (Electron) or go to menu (web)
      if (window.electronAPI) {
        window.electronAPI.quitApp();
      } else {
        this.showMenu();
      }
      return;
    }
    if (this.state === State.SETTINGS) {
      this.closeSettings();
      return;
    }
    if (this.state === State.SHOWING_WORD || this.state === State.CELEBRATING) {
      this.showSummary();
      return;
    }
    // From menu: quit if Electron
    if (this.state === State.MENU && window.electronAPI) {
      window.electronAPI.quitApp();
    }
  }

  // ===== SESSION SUMMARY =====

  showSummary() {
    this.state = State.SUMMARY;
    this.clearIdleTimer();
    this.hideIdleNudge();

    if (this.wordsCompleted === 0) {
      // Nothing to show, just go to menu
      this.showMenu();
      return;
    }

    this.summaryCount.textContent = `You typed ${this.wordsCompleted} word${this.wordsCompleted === 1 ? '' : 's'}!`;
    this.summaryCritters.textContent = this.collectedCritters.join(' ');
    this.summaryOverlay.classList.remove('hidden');
    this.gameArea.classList.add('hidden');
  }
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new Game();
});
