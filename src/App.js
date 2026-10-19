import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// ---------- Game constants ----------
const GRID_SIZE = 20; // 20 x 20 cells
const CELL = 100 / GRID_SIZE; // cell size in % of the board
const STORAGE_KEY = 'snake-high-scores';
const THEME_KEY = 'snake-theme';
const MUSIC_KEY = 'snake-muted';
const BG_MUSIC = `${process.env.PUBLIC_URL}/musics/bg_music.mp3`;
const EAT_SOUND = `${process.env.PUBLIC_URL}/musics/eat_sound.mp3`;
const GAME_OVER_SOUND = `${process.env.PUBLIC_URL}/musics/game_over.mp3`;
const EAT_SOUND_SKIP = 3; // eat_sound.mp3 has ~3s of silence up front - start at 3s to play only the crunch clip

// ---------- Clay themes (all colors flow through CSS variables) ----------
const THEMES = [
  {
    id: 'meadow',
    name: 'Meadow',
    page: ['#e9edf7', '#f2edfb', '#e6f2ec'],
    piece: '#eef1f9',
    pieceDeep: '#e6eaf5',
    board: '#e3e7f3',
    grid: 'rgba(133,148,177,0.16)',
    overlay: 'rgba(233,237,247,0.82)',
    accent: '#34d399',
    accentText: '#014034',
    accentStrong: '#059669',
    title: ['#10b981', '#a3e635'],
    snakeHead: '#4ade80',
    snakeHue: 150,
    food: ['#fda4af', '#f43f5e'],
  },
  {
    id: 'ocean',
    name: 'Ocean',
    page: ['#e7f2f8', '#eef4fd', '#e3f0f2'],
    piece: '#eaf3fb',
    pieceDeep: '#ddebf5',
    board: '#d9e9f4',
    grid: 'rgba(96,140,175,0.16)',
    overlay: 'rgba(226,240,249,0.82)',
    accent: '#38bdf8',
    accentText: '#082f49',
    accentStrong: '#0284c7',
    title: ['#0ea5e9', '#818cf8'],
    snakeHead: '#7dd3fc',
    snakeHue: 198,
    food: ['#fda4af', '#f43f5e'],
  },
  {
    id: 'sunset',
    name: 'Sunset',
    page: ['#fdf1e7', '#fbe7ee', '#fdf6e9'],
    piece: '#fceede',
    pieceDeep: '#f6e2d2',
    board: '#f7e6d8',
    grid: 'rgba(190,130,100,0.18)',
    overlay: 'rgba(253,240,230,0.82)',
    accent: '#fb923c',
    accentText: '#431407',
    accentStrong: '#ea580c',
    title: ['#f97316', '#ec4899'],
    snakeHead: '#fdba74',
    snakeHue: 24,
    food: ['#a3e635', '#65a30d'],
  },
  {
    id: 'grape',
    name: 'Grape',
    page: ['#f1ecfa', '#f8ecf6', '#eceefb'],
    piece: '#f0ebfa',
    pieceDeep: '#e5ddf4',
    board: '#e8e2f5',
    grid: 'rgba(150,130,180,0.16)',
    overlay: 'rgba(238,234,248,0.82)',
    accent: '#a78bfa',
    accentText: '#2e1065',
    accentStrong: '#7c3aed',
    title: ['#8b5cf6', '#e879f9'],
    snakeHead: '#c4b5fd',
    snakeHue: 262,
    food: ['#fda4af', '#f43f5e'],
  },
];

const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const KEY_MAP = {
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
  ArrowLeft: 'LEFT',
  ArrowRight: 'RIGHT',
  w: 'UP',
  s: 'DOWN',
  a: 'LEFT',
  d: 'RIGHT',
};

const INITIAL_SNAKE = [
  { x: 7, y: 10 },
  { x: 6, y: 10 },
  { x: 5, y: 10 },
];

// ---------- Local storage helpers ----------
function loadHighScores() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((n) => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

function saveHighScores(scores) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch {
    // storage unavailable (private mode etc.) - scores just won't persist
  }
}

function randomCell(exclude) {
  const taken = new Set(exclude.map((c) => `${c.x},${c.y}`));
  const free = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!taken.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  return free[Math.floor(Math.random() * free.length)];
}

// ---------- Small UI pieces ----------
function StatCard({ label, value }) {
  return (
    <div className="flex min-w-[92px] flex-col items-center rounded-2xl bg-[color:var(--piece)] px-4 py-2 shadow-clay">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 sm:text-xs">
        {label}
      </span>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: -10, opacity: 0, scale: 1.4 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 10, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="text-xl font-bold text-[color:var(--accent-strong)] sm:text-2xl"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function HighScorePanel({ scores }) {
  return (
    <div className="w-full max-w-[520px] rounded-[1.75rem] bg-[color:var(--piece)] p-4 shadow-clay lg:max-w-xs">
      <h2 className="mb-3 flex items-center justify-between text-sm font-bold uppercase tracking-widest text-amber-600">
        <span>Hall of Fame</span>
        <span className="text-slate-400">Top 5</span>
      </h2>
      {scores.length === 0 ? (
        <p className="text-sm text-slate-500">
          No scores yet. Play a game to claim the top spot!
        </p>
      ) : (
        <ol className="space-y-2">
          {scores.map((score, i) => (
            <motion.li
              key={`${score}-${i}`}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              className="flex items-center justify-between rounded-xl bg-[color:var(--piece-deep)] px-3 py-2 shadow-clay-inset"
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shadow-clay-sm ${
                  i === 0
                    ? 'bg-amber-300 text-amber-800'
                    : i === 1
                    ? 'bg-slate-200 text-slate-600'
                    : i === 2
                    ? 'bg-orange-300 text-orange-800'
                    : 'bg-indigo-200 text-indigo-600'
                }`}
              >
                {i + 1}
              </span>
              <span className="font-mono text-sm font-semibold text-slate-700">
                {score}
              </span>
            </motion.li>
          ))}
        </ol>
      )}
    </div>
  );
}

function DPadButton({ onPress, children, className = '' }) {
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--piece)] text-2xl text-[color:var(--accent-strong)] shadow-clay-sm ${className}`}
      aria-label={children}
    >
      {children}
    </motion.button>
  );
}

function ThemePicker({ themeId, onChange }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[color:var(--piece)] px-4 py-2 shadow-clay">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 sm:text-xs">
        Theme
      </span>
      <div className="flex gap-2.5">
        {THEMES.map((t) => (
          <motion.button
            key={t.id}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.8 }}
            onClick={() => onChange(t.id)}
            aria-label={`${t.name} theme`}
            title={t.name}
            className="h-7 w-7 rounded-full"
            style={{
              background: `linear-gradient(135deg, ${t.accent}, ${t.snakeHead})`,
              outline: themeId === t.id ? '3px solid rgba(71,85,105,0.7)' : 'none',
              outlineOffset: 2,
              boxShadow:
                'inset 1.5px 1.5px 3px rgba(255,255,255,0.75), inset -1.5px -1.5px 3px rgba(0,0,0,0.2), 0 2px 5px rgba(133,148,177,0.4)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function SoundToggle({ muted, onToggle }) {
  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.85 }}
      onClick={onToggle}
      aria-label={muted ? 'Unmute music' : 'Mute music'}
      title={muted ? 'Unmute music' : 'Mute music'}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--piece)] text-slate-500 shadow-clay"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
        {muted ? (
          <>
            <line x1="16" y1="10" x2="21" y2="15" />
            <line x1="21" y1="10" x2="16" y2="15" />
          </>
        ) : (
          <>
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </>
        )}
      </svg>
    </motion.button>
  );
}

// ---------- Main App ----------
function App() {
  const [status, setStatus] = useState('idle'); // idle | running | paused | gameover
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [food, setFood] = useState(() => randomCell(INITIAL_SNAKE));
  const [score, setScore] = useState(0);
  const [highScores, setHighScores] = useState(loadHighScores);
  const [isNewHigh, setIsNewHigh] = useState(false);
  const [themeId, setThemeId] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) || 'meadow';
    } catch {
      return 'meadow';
    }
  });
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem(MUSIC_KEY) === '1';
    } catch {
      return false;
    }
  });

  const audioRef = useRef(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  // preloaded pools of sound effect instances - creating a fresh Audio() at
  // eat time made the sound lag ~seconds while the file buffered/decoded
  const poolRef = useRef({});
  const ensurePool = useCallback((src) => {
    if (!poolRef.current[src]) {
      poolRef.current[src] = Array.from({ length: 3 }, () => {
        const a = new Audio();
        a.preload = 'auto';
        a.src = src;
        a.load();
        return a;
      });
    }
    return poolRef.current[src];
  }, []);

  // one-shot sound effects; pool lets rapid eats overlap with zero delay
  const playEffect = useCallback((src, volume = 0.6, startAt = 0) => {
    if (mutedRef.current) return;
    const pool = ensurePool(src);
    const audio = pool.find((a) => a.paused || a.ended) || pool[0];
    audio.volume = volume;
    try {
      audio.currentTime = startAt;
    } catch {
      // not seekable yet - fall back to playing from the start
    }
    audio.play().catch(() => {});
  }, [ensurePool]);

  // warm up the sound files as soon as the app loads
  useEffect(() => {
    ensurePool(EAT_SOUND);
    ensurePool(GAME_OVER_SOUND);
  }, [ensurePool]);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio(BG_MUSIC);
      audio.loop = true;
      audio.volume = 0.45;
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme.id);
    } catch {
      // storage unavailable - theme just won't persist
    }
  }, [theme]);

  // Refs hold the authoritative game state so the tick never reads stale state
  const snakeRef = useRef(INITIAL_SNAKE);
  const foodRef = useRef(food);
  const dirRef = useRef(DIRECTIONS.RIGHT);
  const queueRef = useRef(null); // direction queued by the player this tick
  const scoreRef = useRef(0);
  const statusRef = useRef(status);
  const touchStartRef = useRef(null);

  statusRef.current = status;

  const speed = Math.max(75, 150 - score * 4); // ms per step, faster as you score

  const changeDirection = useCallback((name) => {
    if (statusRef.current !== 'running') return;
    const next = DIRECTIONS[name];
    const current = queueRef.current || dirRef.current;
    // ignore reversals and repeats
    if (next.x === -current.x && next.y === -current.y) return;
    if (next.x === current.x && next.y === current.y) return;
    queueRef.current = next;
  }, []);

  const finishGame = useCallback(() => {
    setStatus('gameover');
    playEffect(GAME_OVER_SOUND, 0.7);
    const finalScore = scoreRef.current;
    const previousBest = loadHighScores()[0] ?? 0;
    const updated = [...loadHighScores(), finalScore]
      .sort((a, b) => b - a)
      .slice(0, 5);
    saveHighScores(updated);
    setHighScores(updated);
    setIsNewHigh(finalScore > 0 && finalScore > previousBest);
  }, [playEffect]);

  const startGame = useCallback(() => {
    snakeRef.current = INITIAL_SNAKE;
    setSnake(INITIAL_SNAKE);
    const newFood = randomCell(INITIAL_SNAKE);
    foodRef.current = newFood;
    setFood(newFood);
    dirRef.current = DIRECTIONS.RIGHT;
    queueRef.current = null;
    scoreRef.current = 0;
    setScore(0);
    setIsNewHigh(false);
    setStatus('running');
    // start background music right inside the user gesture (click / key / tap)
    const audio = getAudio();
    audio.muted = muted;
    if (!muted) audio.play().catch(() => {});
  }, [getAudio, muted]);

  const togglePause = useCallback(() => {
    setStatus((s) => (s === 'running' ? 'paused' : s === 'paused' ? 'running' : s));
  }, []);

  // ---------- Music state follows the game / mute toggle ----------
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = muted;
    if (muted || status === 'paused') {
      audio.pause();
    } else if (status !== 'idle') {
      audio.play().catch(() => {});
    }
  }, [muted, status]);

  useEffect(() => {
    try {
      localStorage.setItem(MUSIC_KEY, muted ? '1' : '0');
    } catch {
      // storage unavailable - mute preference just won't persist
    }
  }, [muted]);

  useEffect(() => {
    return () => audioRef.current?.pause();
  }, []);

  // ---------- Game loop ----------
  useEffect(() => {
    if (status !== 'running') return;

    const tick = () => {
      if (queueRef.current) {
        dirRef.current = queueRef.current;
        queueRef.current = null;
      }
      const dir = dirRef.current;
      const head = snakeRef.current[0];
      const newHead = { x: head.x + dir.x, y: head.y + dir.y };

      // wall collision
      if (
        newHead.x < 0 ||
        newHead.x >= GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= GRID_SIZE
      ) {
        finishGame();
        return;
      }

      const willEat =
        newHead.x === foodRef.current.x && newHead.y === foodRef.current.y;

      // self collision (tail moves away unless we eat this tick)
      const body = willEat ? snakeRef.current : snakeRef.current.slice(0, -1);
      if (body.some((c) => c.x === newHead.x && c.y === newHead.y)) {
        finishGame();
        return;
      }

      const nextSnake = willEat
        ? [newHead, ...snakeRef.current]
        : [newHead, ...snakeRef.current.slice(0, -1)];

      if (willEat) {
        playEffect(EAT_SOUND, 0.5, EAT_SOUND_SKIP);
        scoreRef.current += 1;
        setScore(scoreRef.current);
        const nextFood = randomCell(nextSnake);
        foodRef.current = nextFood;
        setFood(nextFood);
      }

      snakeRef.current = nextSnake;
      setSnake(nextSnake);
    };

    const id = setInterval(tick, speed);
    return () => clearInterval(id);
  }, [status, speed, finishGame, playEffect]);

  // ---------- Keyboard controls ----------
  useEffect(() => {
    const onKeyDown = (e) => {
      const dirName = KEY_MAP[e.key] ?? KEY_MAP[e.key.toLowerCase()];
      if (dirName) {
        e.preventDefault();
        changeDirection(dirName);
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        if (statusRef.current === 'idle' || statusRef.current === 'gameover') {
          startGame();
        } else {
          togglePause();
        }
      }
      if (e.key === 'Enter' && (statusRef.current === 'idle' || statusRef.current === 'gameover')) {
        startGame();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [changeDirection, startGame, togglePause]);

  // ---------- Swipe controls (mobile) ----------
  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; // ignore taps
    if (Math.abs(dx) > Math.abs(dy)) {
      changeDirection(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      changeDirection(dy > 0 ? 'DOWN' : 'UP');
    }
  };

  const best = highScores[0] ?? 0;

  // ---------- Render ----------
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 font-game text-slate-600 sm:gap-6"
      style={{
        '--piece': theme.piece,
        '--piece-deep': theme.pieceDeep,
        '--board': theme.board,
        '--grid': theme.grid,
        '--overlay': theme.overlay,
        '--accent': theme.accent,
        '--accent-text': theme.accentText,
        '--accent-strong': theme.accentStrong,
        '--title-from': theme.title[0],
        '--title-to': theme.title[1],
        '--snake-head': theme.snakeHead,
        '--snake-hue': theme.snakeHue,
        '--food-from': theme.food[0],
        '--food-to': theme.food[1],
        background: `linear-gradient(150deg, ${theme.page[0]} 0%, ${theme.page[1]} 45%, ${theme.page[2]} 100%)`,
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Header */}
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center text-3xl font-black tracking-tight sm:text-4xl"
      >
        <span className="bg-gradient-to-r from-[color:var(--title-from)] to-[color:var(--title-to)] bg-clip-text text-transparent drop-shadow-[0_2px_0_rgba(255,255,255,0.9)]">
          SNAKE
        </span>{' '}
        <span className="text-slate-400">GAME</span>
      </motion.h1>

      <div className="flex items-center gap-3">
        <ThemePicker themeId={theme.id} onChange={setThemeId} />
        <SoundToggle muted={muted} onToggle={() => setMuted((m) => !m)} />
      </div>

      {/* Score bar */}
      <div className="flex items-center gap-3 sm:gap-4">
        <StatCard label="Score" value={score} />
        <StatCard label="Best" value={best} />
        <StatCard label="Speed" value={`${Math.round((150 / speed) * 10) / 10}x`} />
      </div>

      <div className="flex w-full flex-col items-center gap-5 lg:flex-row lg:items-start lg:justify-center">
        {/* Board + overlays */}
        <div className="relative aspect-square w-full max-w-[min(92vw,520px)] shrink-0 select-none lg:max-w-[min(60vh,540px)]">
          <div
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onClick={() => {
              if (status === 'idle' || status === 'gameover') startGame();
            }}
            className="touch-none relative h-full w-full overflow-hidden rounded-[2rem] bg-[color:var(--board)] shadow-clay"
            style={{
              backgroundImage:
                'linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)',
              backgroundSize: `${CELL}% ${CELL}%`,
            }}
          >
            {/* Food */}
            <motion.div
              animate={{
                left: `${food.x * CELL}%`,
                top: `${food.y * CELL}%`,
                scale: [1, 1.2, 1],
              }}
              transition={{
                scale: { duration: 0.9, repeat: Infinity, ease: 'easeInOut' },
              }}
              className="absolute z-10 rounded-full bg-gradient-to-br from-[color:var(--food-from)] to-[color:var(--food-to)] shadow-clay-rose"
              style={{ width: `${CELL}%`, height: `${CELL}%` }}
            />

            {/* Snake */}
            {snake.map((segment, i) => (
              <motion.div
                key={i}
                animate={{
                  left: `${segment.x * CELL}%`,
                  top: `${segment.y * CELL}%`,
                }}
                transition={{ duration: speed / 1000, ease: 'linear' }}
                className={`absolute rounded-[30%] ${
                  i === 0 ? 'z-20 rounded-[42%]' : 'z-10'
                }`}
                style={{
                  width: `${CELL}%`,
                  height: `${CELL}%`,
                  backgroundColor: i === 0 ? 'var(--snake-head)' : `hsl(var(--snake-hue), 70%, ${Math.max(62 - i * 1.2, 40)}%)`,
                  boxShadow:
                    i === 0
                      ? 'inset 2px 2px 3px rgba(255,255,255,0.85), inset -2px -2px 4px rgba(6,95,70,0.4), 0 4px 7px rgba(133,148,177,0.4)'
                      : 'inset 1.5px 1.5px 3px rgba(255,255,255,0.55), inset -1.5px -1.5px 3px rgba(6,95,70,0.35), 0 3px 5px rgba(133,148,177,0.3)',
                }}
              />
            ))}

            {/* Overlays */}
            <AnimatePresence>
              {(status === 'idle' || status === 'paused' || status === 'gameover') && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-[color:var(--overlay)] p-6 backdrop-blur-sm"
                >
                  {status === 'idle' && (
                    <>
                      <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                        className="flex gap-1"
                      >
                        {[0, 1, 2, 3].map((i) => (
                          <span
                            key={i}
                            className="h-5 w-5 rounded-[35%] shadow-clay-sm"
                            style={{ backgroundColor: `hsl(calc(var(--snake-hue) - ${i * 8}), 75%, ${68 - i * 8}%)` }}
                          />
                        ))}
                      </motion.div>
                      <p className="text-center text-lg font-semibold text-slate-600">
                        Eat the red food, grow longer, don&apos;t crash!
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={startGame}
                        className="rounded-2xl bg-[color:var(--accent)] px-8 py-3 text-lg font-bold text-[color:var(--accent-text)] shadow-clay-sm"
                      >
                        Start Game
                      </motion.button>
                      <p className="text-center text-xs text-slate-500 sm:text-sm">
                        Desktop: Arrow keys / WASD · Space to pause
                        <br />
                        Mobile: Swipe the board or use the D-pad below
                      </p>
                    </>
                  )}

                  {status === 'paused' && (
                    <motion.div
                      initial={{ scale: 0.7 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0.7 }}
                      className="text-center"
                    >
                      <p className="text-4xl font-black text-amber-500">PAUSED</p>
                      <button
                        onClick={togglePause}
                        className="mt-4 rounded-2xl bg-[color:var(--accent)] px-6 py-2 font-bold text-[color:var(--accent-text)] shadow-clay-sm"
                      >
                        Resume
                      </button>
                    </motion.div>
                  )}

                  {status === 'gameover' && (
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                      className="flex flex-col items-center gap-3 text-center"
                    >
                      <p className="text-4xl font-black text-rose-500">GAME OVER</p>
                      <p className="text-xl text-slate-600">
                        Score: <span className="font-bold text-[color:var(--accent-strong)]">{score}</span>
                      </p>
                      {isNewHigh && (
                        <motion.p
                          animate={{ rotate: [-2, 2, -2] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                          className="rounded-full bg-amber-300 px-4 py-1 text-sm font-bold text-amber-800 shadow-clay-sm"
                        >
                          New High Score!
                        </motion.p>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={startGame}
                        className="mt-2 rounded-2xl bg-[color:var(--accent)] px-8 py-3 text-lg font-bold text-[color:var(--accent-text)] shadow-clay-sm"
                      >
                        Play Again
                      </motion.button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right column: leaderboard (desktop) */}
        <div className="hidden w-full max-w-xs lg:block">
          <HighScorePanel scores={highScores} />
        </div>
      </div>

      {/* Mobile D-pad + leaderboard */}
      <div className="flex w-full max-w-[520px] flex-col items-center gap-5 lg:hidden">
        <div className="grid grid-cols-3 gap-2">
          <div />
          <DPadButton onPress={() => changeDirection('UP')}>▲</DPadButton>
          <div />
          <DPadButton onPress={() => changeDirection('LEFT')}>◀</DPadButton>
          <DPadButton onPress={() => changeDirection('DOWN')}>▼</DPadButton>
          <DPadButton onPress={() => changeDirection('RIGHT')}>▶</DPadButton>
        </div>
        <HighScorePanel scores={highScores} />
      </div>

      <p className="text-center text-xs text-slate-500">
        {status === 'running' ? 'Space / tap here to pause' : 'Press Space or Enter to start'}
      </p>
    </div>
  );
}

export default App;
