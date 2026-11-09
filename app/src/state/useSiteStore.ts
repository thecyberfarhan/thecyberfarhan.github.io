import { create } from 'zustand';

export type Theme = 'dark' | 'light';
export type MotionLevel = 0 | 1 | 2;

const THEME_KEY = 'theme';
const MOTION_KEY = 'motionLevel';

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch { /* storage unavailable */ }
  return 'dark';
}

function readMotionLevel(): MotionLevel {
  try {
    const stored = localStorage.getItem(MOTION_KEY);
    if (stored === '0' || stored === '1' || stored === '2') return Number(stored) as MotionLevel;
  } catch { /* storage unavailable */ }
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
  } catch { /* matchMedia unavailable */ }
  return 1;
}

interface SiteState {
  theme: Theme;
  motionLevel: MotionLevel;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setMotionLevel: (level: MotionLevel) => void;
  cycleMotionLevel: () => void;
}

export const useSiteStore = create<SiteState>((set, get) => ({
  theme: readTheme(),
  motionLevel: readMotionLevel(),
  setTheme: (theme) => {
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
  setMotionLevel: (level) => {
    try { localStorage.setItem(MOTION_KEY, String(level)); } catch { /* ignore */ }
    document.documentElement.setAttribute('data-motion', String(level));
    set({ motionLevel: level });
  },
  cycleMotionLevel: () => {
    const next = ((get().motionLevel + 1) % 3) as MotionLevel;
    get().setMotionLevel(next);
  },
}));
