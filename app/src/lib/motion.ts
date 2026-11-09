import { useSiteStore } from '../state/useSiteStore';

/**
 * The motion level is a dial (Calm / Dynamic / Max), not an on/off switch.
 * Every timeline/tween in the app scales its own base duration through this
 * factor instead of hardcoding a raw number, so turning the dial up genuinely
 * means "longer, more deliberate" and turning it down means "today's baseline" —
 * never "nothing happens."
 */
const SCALE: Record<0 | 1 | 2, number> = { 0: 0.6, 1: 1, 2: 1.6 };
const STAGGER: Record<0 | 1 | 2, number> = { 0: 0.6, 1: 1, 2: 1.8 };

export function motionScale(): number {
  return SCALE[useSiteStore.getState().motionLevel];
}

export function motionStagger(): number {
  return STAGGER[useSiteStore.getState().motionLevel];
}

/** Scale a base duration (seconds) by the current motion level. */
export function dur(base: number): number {
  return base * motionScale();
}

/** Scale a base stagger (seconds) by the current motion level. */
export function stagger(base: number): number {
  return base * motionStagger();
}

/** Whether idle ambient systems (background shapes, idle hint bubbles) should run at all. */
export function ambientEnabled(): boolean {
  return useSiteStore.getState().motionLevel > 0;
}

/** How many ambient elements (particles, shapes) to render at the current level. */
export function ambientDensity(base: number): number {
  const level = useSiteStore.getState().motionLevel;
  if (level === 0) return 0;
  if (level === 1) return base;
  return Math.round(base * 1.6);
}
