# Type Critters

A fun, colorful typing game for young kids (ages 4-7). Words appear in big bouncing letters — type each one and get rewarded with a picture and confetti!

## How It Works

1. A word appears in large, colorful letters
2. The current letter to type bounces and highlights
3. Type the right key — it turns green with a pop
4. Wrong key? Gentle wobble, no penalty, keep going
5. Finish the word — confetti, emoji, and HOORAY!
6. Press Space for the next word

No scores, no timers, no lives. Pure positive reinforcement.

## Run It

### Desktop (Electron)

```bash
npm install
npm start
```

Press Escape to quit.

### Web (local network)

```bash
npm run web
```

Open `http://localhost:3000` in any browser. Share the link on your local network using your machine's IP.

## Build Windows Executable

```bash
npm run make
```

Output goes to `out/`.

## Word List

70 common nouns (3-5 letters) with emoji: animals, food, nature, toys, and household items. See `src/words.js`.
