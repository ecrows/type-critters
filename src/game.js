// Game state machine
const State = {
  MENU: 'menu',
  SHOWING_WORD: 'showing',
  CELEBRATING: 'celebrating',
  ROUND_COMPLETE: 'round_complete',
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
    this.bossWordQueue = [];
    this.currentWord = null;
    this.currentEmoji = null;
    this.cursorPos = 0;
    this.state = State.MENU;
    this.colorIndex = 0;
    this.collectedCritters = [];
    this.wordsCompleted = 0;
    this.wordsInRound = 0;    // 0-4; boss word fires when this reaches 4
    this.roundCritters = [];  // emojis collected this round (for overlay)
    this.isBossWord = false;

    // Round complete state
    this.roundFirstPressed = false;   // has kid pressed space once yet?
    this.roundCanContinue = false;    // timer expired after first press?
    this.roundContinueTimer = null;
    this.roundAnimFrame = null;
    this.roundEmojiObjects = [];      // [{el, x, y, vx, vy}] for JS animation

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
    this.spacebarKeyEl = this.promptEl.querySelector('.spacebar-key');
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
    this.bossBannerEl = document.getElementById('boss-banner');
    this.roundOverlay = document.getElementById('round-overlay');
    this.roundOverlayTitle = document.getElementById('round-overlay-title');
    this.roundOverlayEmojis = document.getElementById('round-overlay-emojis');
    this.roundFireworksPrompt = document.getElementById('round-fireworks-prompt');
    this.roundOverlayPrompt = document.getElementById('round-overlay-prompt');
    this.unicornEl = document.getElementById('unicorn');

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

    // Electron IPC: handle Escape from main process
    if (window.electronAPI) {
      window.electronAPI.onEscapePressed(() => this.handleEscape());
    }

    // Reposition last-key on resize
    window.addEventListener('resize', () => this.positionLastKey());
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

    return filtered.length > 0 ? filtered : WORDS;
  }

  getBossWords() {
    if (this.settings.category !== 'all') {
      const filtered = BOSS_WORDS.filter(([, , cat]) => cat === this.settings.category);
      return filtered.length > 0 ? filtered : BOSS_WORDS;
    }
    return BOSS_WORDS;
  }

  // ===== EVENT BINDING =====

  bindEvents() {
    window.addEventListener('keydown', (e) => this.onKey(e));

    this.playBtn.addEventListener('click', () => {
      this.sounds.click();
      this.startGame();
    });

    this.settingsGear.addEventListener('mousedown', () => this.startGearHold());
    this.settingsGear.addEventListener('touchstart', (e) => { e.preventDefault(); this.startGearHold(); });
    this.settingsGear.addEventListener('mouseup', () => this.cancelGearHold());
    this.settingsGear.addEventListener('mouseleave', () => this.cancelGearHold());
    this.settingsGear.addEventListener('touchend', () => this.cancelGearHold());
    this.settingsGear.addEventListener('touchcancel', () => this.cancelGearHold());

    this.settingsCloseBtn.addEventListener('click', () => this.closeSettings());

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
    this.stopRoundCelebration();
    this.paradeEl.innerHTML = '';
    this.collectedCritters = [];
    this.wordsCompleted = 0;
    this.wordsInRound = 0;
    this.roundCritters = [];
    this.isBossWord = false;
    this.clearIdleTimer();

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
    this.bossWordQueue = [];
    this.wordsInRound = 0;
    this.roundCritters = [];
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
    document.activeElement.blur();
    if (this.state === State.SHOWING_WORD) {
      this.rebuildCurrentWord();
      this.resetIdleTimer();
    }
  }

  // ===== WORD MANAGEMENT =====

  refillQueue() {
    this.wordQueue = shuffle([...this.getFilteredWords()]);
  }

  refillBossQueue() {
    this.bossWordQueue = shuffle([...this.getBossWords()]);
  }

  formatLetter(ch) {
    return this.settings.uppercase ? ch : ch.toLowerCase();
  }

  nextWord() {
    this.isBossWord = (this.wordsInRound === 4);

    let word, emoji;
    if (this.isBossWord) {
      if (this.bossWordQueue.length === 0) this.refillBossQueue();
      [word, emoji] = this.bossWordQueue.pop();
    } else {
      if (this.wordQueue.length === 0) this.refillQueue();
      [word, emoji] = this.wordQueue.pop();
    }

    this.currentWord = word;
    this.currentEmoji = emoji;
    this.cursorPos = 0;
    this.state = State.SHOWING_WORD;
    this.colorIndex = (this.colorIndex + 1) % HIGHLIGHT_COLORS.length;

    this.celebrationEl.classList.remove('visible');
    this.promptEl.classList.remove('visible');
    this.hideIdleNudge();

    this.lettersContainer.innerHTML = '';
    this.lettersContainer.classList.toggle('boss-word', this.isBossWord);

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

    this.lettersContainer.classList.remove('fade-out');
    this.lettersContainer.classList.add('fade-in');

    if (this.isBossWord) this.showBossBanner();

    this.resetIdleTimer();
  }

  rebuildCurrentWord() {
    if (!this.currentWord) return;
    const letters = this.lettersContainer.querySelectorAll('.letter');
    for (let i = 0; i < letters.length; i++) {
      letters[i].textContent = this.formatLetter(this.currentWord[i]);
    }
  }

  showBossBanner() {
    const el = this.bossBannerEl;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }

  // ===== INPUT =====

  onKey(e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    if (e.key === 'Escape') {
      this.handleEscape();
      return;
    }

    if (this.state === State.MENU) {
      if (e.key === ' ' || e.key === 'Enter') {
        this.sounds.click();
        this.startGame();
      }
      return;
    }

    if (this.state === State.SETTINGS || this.state === State.SUMMARY) return;

    if (e.key.length !== 1 && e.key !== ' ') return;

    // Round complete: space = fireworks (always), advance only after continue prompt appears
    if (this.state === State.ROUND_COMPLETE) {
      if (e.key === ' ') {
        // Burst confetti at a random position
        const cx = (0.1 + Math.random() * 0.8) * window.innerWidth;
        const cy = (0.1 + Math.random() * 0.7) * window.innerHeight;
        this.confetti.burst(cx, cy, 45);
        this.sounds.fanfare();

        if (!this.roundFirstPressed) {
          // First press: start the 5-second timer before "continue" appears
          this.roundFirstPressed = true;
          this.roundContinueTimer = setTimeout(() => {
            this.roundCanContinue = true;
            // Swap prompts: hide fireworks, show continue
            this.roundFireworksPrompt.classList.add('hidden-fade');
            this.roundOverlayPrompt.classList.add('visible');
          }, 5000);
        } else if (this.roundCanContinue) {
          // Press the spacebar key visually then advance
          const key = this.roundOverlayPrompt.querySelector('.spacebar-key');
          if (key) {
            key.classList.add('pressed');
            setTimeout(() => key.classList.remove('pressed'), 120);
          }
          setTimeout(() => this.advanceRound(), 130);
        }
      }
      return;
    }

    if (this.state === State.CELEBRATING) {
      if (e.key === ' ') {
        if (this.spacebarKeyEl) {
          this.spacebarKeyEl.classList.add('pressed');
          setTimeout(() => this.spacebarKeyEl.classList.remove('pressed'), 120);
        }
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
      this.sounds.pop(this.cursorPos); // pitch steps up with each correct letter
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
      this.sounds.boop();
      this.showLastKey(this.formatLetter(typed), false);
      currentEl.classList.add('wobble');
      setTimeout(() => currentEl.classList.remove('wobble'), 300);
    }
  }

  positionLastKey() {
    const promptRect = this.promptEl.getBoundingClientRect();
    const paradeRect = this.paradeEl.getBoundingClientRect();

    const gapTop = promptRect.bottom;
    const gapBottom = paradeRect.top > 0 ? paradeRect.top : window.innerHeight - 12;
    const gap = gapBottom - gapTop;

    const maxSize = Math.min(160, window.innerWidth * 0.12);
    const fittedSize = Math.min(maxSize, gap * 0.7);
    const fontSize = Math.max(40, fittedSize);

    this.lastKeyEl.style.fontSize = `${fontSize}px`;
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
    this.wordsInRound++;
    this.clearIdleTimer();

    this.addCritter(this.currentEmoji);
    this.roundCritters.push(this.currentEmoji);

    if (Math.random() < 0.2) this.flyUnicorn();

    this.sounds.fanfare();

    this.emojiEl.textContent = this.currentEmoji;
    this.celebrationEl.classList.add('visible');

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    this.confetti.burst(cx, cy, 70);
    setTimeout(() => {
      this.confetti.burst(cx + (Math.random() - 0.5) * 200, cy - 50, 30);
    }, 300);

    if (this.wordsInRound >= 5) {
      setTimeout(() => this.showRoundComplete(), 1400);
    } else {
      setTimeout(() => {
        this.promptEl.classList.add('visible');
      }, 1500);
    }
  }

  // ===== ROUND COMPLETE =====

  showRoundComplete() {
    this.state = State.ROUND_COMPLETE;
    this.roundFirstPressed = false;
    this.roundCanContinue = false;

    // Hide normal celebration
    this.celebrationEl.classList.remove('visible');
    this.promptEl.classList.remove('visible');

    // Restart AMAZING! pop animation
    this.roundOverlayTitle.classList.remove('pop');
    void this.roundOverlayTitle.offsetWidth;
    this.roundOverlayTitle.classList.add('pop');

    // Reset prompts
    this.roundFireworksPrompt.classList.remove('hidden-fade');
    this.roundOverlayPrompt.classList.remove('visible');

    // Build emoji objects for JS animation
    this.roundOverlayEmojis.innerHTML = '';
    this.roundEmojiObjects = [];

    // Emoji size approximation for boundary checking
    const emojiSize = Math.min(130, Math.max(70, window.innerWidth * 0.12));
    const margin = emojiSize * 0.5;

    this.roundCritters.forEach((emoji) => {
      const span = document.createElement('span');
      span.textContent = emoji;
      this.roundOverlayEmojis.appendChild(span);

      const x = margin + Math.random() * (window.innerWidth - emojiSize - margin * 2);
      const y = margin + Math.random() * (window.innerHeight * 0.6);
      const speed = 2.0 + Math.random() * 1.8;
      const angle = Math.random() * Math.PI * 2;

      span.style.left = `${x}px`;
      span.style.top = `${y}px`;

      this.roundEmojiObjects.push({ el: span, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
    });

    this.roundOverlay.classList.add('visible');

    // Play victory tune
    this.sounds.victory();

    // Big confetti burst
    this.confetti.burst(window.innerWidth / 2, window.innerHeight / 2, 120);
    setTimeout(() => {
      this.confetti.burst(window.innerWidth * 0.2, window.innerHeight * 0.4, 50);
      this.confetti.burst(window.innerWidth * 0.8, window.innerHeight * 0.4, 50);
    }, 350);

    // Start emoji animation loop
    this.animateRoundEmojis();
  }

  animateRoundEmojis() {
    if (this.state !== State.ROUND_COMPLETE) return;

    const emojiSize = Math.min(130, Math.max(70, window.innerWidth * 0.12));
    const maxX = window.innerWidth - emojiSize;
    const maxY = window.innerHeight - emojiSize;

    for (const obj of this.roundEmojiObjects) {
      obj.x += obj.vx;
      obj.y += obj.vy;

      if (obj.x <= 0) { obj.vx = Math.abs(obj.vx); obj.x = 0; }
      else if (obj.x >= maxX) { obj.vx = -Math.abs(obj.vx); obj.x = maxX; }

      if (obj.y <= 0) { obj.vy = Math.abs(obj.vy); obj.y = 0; }
      else if (obj.y >= maxY) { obj.vy = -Math.abs(obj.vy); obj.y = maxY; }

      obj.el.style.left = `${obj.x}px`;
      obj.el.style.top = `${obj.y}px`;
    }

    this.roundAnimFrame = requestAnimationFrame(() => this.animateRoundEmojis());
  }

  stopRoundCelebration() {
    cancelAnimationFrame(this.roundAnimFrame);
    clearTimeout(this.roundContinueTimer);
    this.roundAnimFrame = null;
    this.roundContinueTimer = null;
    this.roundOverlay.classList.remove('visible');
    this.roundOverlayPrompt.classList.remove('visible');
    this.roundFirstPressed = false;
    this.roundCanContinue = false;
  }

  advanceRound() {
    this.stopRoundCelebration();
    this.wordsInRound = 0;
    this.roundCritters = [];
    this.paradeEl.innerHTML = '';
    this.nextWord();
  }

  flyUnicorn() {
    const el = this.unicornEl;
    el.style.top = `${8 + Math.random() * 38}vh`;
    el.classList.remove('fly');
    void el.offsetWidth;
    el.classList.add('fly');
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
    if (this.state === State.ROUND_COMPLETE) {
      this.stopRoundCelebration();
      this.showSummary();
      return;
    }
    if (this.state === State.SUMMARY) {
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
    if (this.state === State.MENU && window.electronAPI) {
      window.electronAPI.quitApp();
    }
  }

  // ===== SESSION SUMMARY =====

  showSummary() {
    this.state = State.SUMMARY;
    this.clearIdleTimer();
    this.hideIdleNudge();
    this.stopRoundCelebration();

    if (this.wordsCompleted === 0) {
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
