// Lab progress lives only in this visitor's browser. Every read and write is guarded:
// private windows and blocked storage just mean progress is not remembered.
export type RoomSave = { answered: string[]; hints: number; done?: boolean; best?: number; doneAt?: string; certName?: string };
type Save = { rooms: Record<string, RoomSave>; badges: string[] };
const KEY = 'fh-lab-v1';

function load(): Save {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object' && s.rooms && typeof s.rooms === 'object' && Array.isArray(s.badges)) {
      // keep only well-formed entries, so a hand-edited save cannot break the page
      const rooms: Record<string, RoomSave> = {};
      for (const [k, r] of Object.entries(s.rooms as Record<string, RoomSave>)) {
        if (r && Array.isArray(r.answered) && typeof r.hints === 'number') rooms[k] = { ...r, answered: r.answered.filter((a) => typeof a === 'string'), certName: typeof r.certName === 'string' ? r.certName.slice(0, 40) : undefined };
      }
      return { rooms, badges: s.badges.filter((b: unknown) => typeof b === 'string') };
    }
  } catch { /* storage blocked or corrupt */ }
  return { rooms: {}, badges: [] };
}
function store(s: Save) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* not remembered, still playable */ }
}

export function getRoom(slug: string): RoomSave {
  return load().rooms[slug] ?? { answered: [], hints: 0 };
}
export function saveRoom(slug: string, r: RoomSave) {
  const s = load();
  s.rooms[slug] = r;
  store(s);
}
export function resetRoom(slug: string) {
  const s = load();
  delete s.rooms[slug];
  store(s);
}

export const BADGES = [
  { id: 'first-blood', name: 'First blood', how: 'Finish any room.' },
  { id: 'all-three', name: 'Full engagement', how: 'Finish all three rooms.' },
  { id: 'clean', name: 'Clean run', how: 'Finish Backup Blues without a hint.' },
  { id: 'ghost', name: 'Ghost', how: 'Finish the Hard room with zero strikes.' },
  { id: 'speed', name: 'Speedrunner', how: 'Finish the Hard room in under two minutes.' },
  { id: 'curious', name: 'Curious', how: 'Find the flag hidden somewhere on this site.' },
  { id: 'night', name: 'Night owl', how: 'Finish a room between midnight and 5 am.' },
  { id: 'pocket', name: 'Pocket hacker', how: 'Finish a room on a phone.' },
] as const;
export type BadgeId = (typeof BADGES)[number]['id'];

export function badges(): string[] { return load().badges; }
// returns true only the first time, so the caller can celebrate once
export function award(id: BadgeId): boolean {
  const s = load();
  if (s.badges.includes(id)) return false;
  s.badges.push(id);
  store(s);
  return true;
}
