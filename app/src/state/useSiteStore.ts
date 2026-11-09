import { create } from 'zustand';

export type MotionLevel = 0 | 1 | 2;

const MOTION_KEY = 'motionLevel';

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
  motionLevel: MotionLevel;
  setMotionLevel: (level: MotionLevel) => void;
  cycleMotionLevel: () => void;
}

export const useSiteStore = create<SiteState>((set, get) => ({
  motionLevel: readMotionLevel(),
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
