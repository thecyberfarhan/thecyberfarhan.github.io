// Scout: the site's robot. It flies between elements marked data-scout="key", perches next to
// one, looks at it and comments; it reacts to lingering, fast scrolling, copying, leaving and
// coming back; it can be hidden. Everything it says is plain text (textContent), never markup.
import { createAvatar } from '@bible-strong/avatar-web';
import character from '../data/scout.avatar.json';
import { line, hasLine, clock, type LineKey } from './lines';

type Action = { label: string; onClick?: () => void };
type SayOpts = { state?: string; gesture?: 'nod' | 'bounce' | 'spin'; ms?: number; actions?: Action[]; stay?: boolean; priority?: boolean };

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const HIDE_KEY = 'fh-scout-hidden';
const VISITS_KEY = 'fh-visits';

let dock: HTMLDivElement, rig: HTMLDivElement, bubble: HTMLDivElement, text: HTMLParagraphElement, buttons: HTMLDivElement, live: HTMLParagraphElement, tab: HTMLButtonElement;
let avatar: ReturnType<typeof createAvatar>;
// Scout dresses for the theme: a white robot on the dark page, a charcoal one with light eyes on the light page
type Theme = 'light' | 'dark';
const currentTheme = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : document.documentElement.dataset.theme === 'dark' ? 'dark' : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
function dressed(theme: Theme) {
  const c = structuredClone(character);
  const light = theme === 'light';
  c.colors.body = light ? '#23262d' : '#eef0f3';
  c.colors.eyes = light ? '#f4f1ea' : '#16181d';
  c.style.outline.color = light ? '#0f1114' : '#16181d';
  c.body.nodes[0].color = light ? '#23262d' : '#16181d';
  c.body.nodes[1].color = light ? '#b4232c' : '#e5534b';
  return c;
}
let wearing: Theme;
function drawAvatar(state = 'idle') {
  wearing = currentTheme();
  avatar = createAvatar(dock.querySelector('.scout-body') as HTMLElement, {
    character: dressed(wearing), state, size: '100%', followPointer: finePointer, paused: reduced, ariaLabel: 'Scout', settleAfterMs: 0,
  });
}
let oldTold = false;
let hideT = 0, typeT = 0, lastSaid = 0, pinned = false, roaming = false, hidden = false, mounted = false;

const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* not remembered */ } },
};
export const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const size = () => (innerWidth < 600 ? 52 : 76);

// ---------------- position: a spring that chases a target point ----------------
const pos = { x: 0, y: 0, vx: 0, vy: 0 };
const goal = { x: 0, y: 0 };
let attached: { el: Element; side: 'left' | 'right' | 'top'; dy: number } | null = null;
let springOn = false;

// phones park Scout at the top right under the nav, where he blocks less than over the bottom
// edge (lab terminals, buttons and the browser's own toolbar all live down there)
function home() {
  if (innerWidth < 600) return { x: innerWidth - size() - 12, y: (document.getElementById('nav')?.offsetHeight ?? 64) + 10 };
  return { x: innerWidth - size() - 22, y: innerHeight - size() - 22 };
}
function aimHome() { attached = null; Object.assign(goal, home()); kick(); }

function place() {
  dock.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
  if (!bubble.hidden) {
    bubble.classList.toggle('left', pos.x > innerWidth / 2);
    bubble.classList.toggle('below', pos.y < 170);
  }
}
function kick() { if (!springOn) { springOn = true; requestAnimationFrame(step); } }
function step() {
  if (attached) {
    const r = attached.el.getBoundingClientRect();
    if (r.bottom < 70 || r.top > innerHeight - 70) { aimHome(); }
    else {
      if (attached.side === 'top') {
        // no room beside it: sit on its top edge, near the right corner
        goal.x = Math.min(r.right - size() - 28, innerWidth - size() - 10);
        goal.y = Math.max(r.top - size() + 6, 76);
      } else {
        goal.x = attached.side === 'right' ? Math.min(r.right + 14, innerWidth - size() - 10) : Math.max(r.left - size() - 14, 10);
        goal.y = Math.min(Math.max(r.top + attached.dy, 76), innerHeight - size() - 12);
      }
    }
  }
  if (reduced) { pos.x = goal.x; pos.y = goal.y; place(); springOn = false; return; }
  const k = 0.06, damp = 0.78;
  pos.vx = (pos.vx + (goal.x - pos.x) * k) * damp;
  pos.vy = (pos.vy + (goal.y - pos.y) * k) * damp;
  pos.x += pos.vx; pos.y += pos.vy;
  const speed = Math.hypot(pos.vx, pos.vy);
  // lean into the direction of travel; stretch a touch when fast
  rig.style.setProperty('--tilt', `${Math.max(-16, Math.min(16, pos.vx * 1.4))}deg`);
  rig.style.setProperty('--stretch', String(1 + Math.min(0.12, speed / 120)));
  dock.classList.toggle('flying', speed > 2.5);
  place();
  const settled = speed < 0.05 && Math.abs(goal.x - pos.x) < 0.5 && Math.abs(goal.y - pos.y) < 0.5;
  // once settled the loop stops; scrolling or resizing kicks it again to follow the perch
  if (settled) { springOn = false; land(); return; }
  requestAnimationFrame(step);
}
function land() {
  if (dock.classList.contains('perched')) return;
  dock.classList.add('perched');
  rig.classList.remove('land'); void rig.offsetWidth; rig.classList.add('land');
}

// ---------------- mount ----------------
function mount() {
  if (mounted) return;
  mounted = true;
  dock = document.createElement('div');
  dock.className = 'scout';
  dock.innerHTML = `
    <div class="scout-bubble" hidden>
      <button class="scout-x" type="button" aria-label="Dismiss">×</button>
      <p class="scout-text" aria-hidden="true"></p>
      <div class="scout-actions"></div>
    </div>
    <div class="scout-rig">
      <button class="scout-body" type="button" aria-label="Scout, the site's robot. Click to poke."></button>
      <span class="scout-shadow" aria-hidden="true"></span>
    </div>
    <button class="scout-hide" type="button" aria-label="Hide Scout" title="Hide Scout">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A9.8 9.8 0 0 1 12 4c5 0 9 5 10 8-.4 1.2-1.3 2.7-2.6 4M6.6 6.6C4.4 8 2.8 10.2 2 12c1 3 5 8 10 8 1.6 0 3.1-.5 4.4-1.2" /></svg>
    </button>
    <p class="sr-only" aria-live="polite"></p>`;
  document.body.appendChild(dock);
  tab = document.createElement('button');
  tab.className = 'scout-tab';
  tab.type = 'button';
  tab.hidden = true;
  tab.innerHTML = '<span aria-hidden="true">●</span> Scout';
  tab.setAttribute('aria-label', 'Bring Scout back');
  document.body.appendChild(tab);

  rig = dock.querySelector('.scout-rig')!;
  bubble = dock.querySelector('.scout-bubble')!;
  text = bubble.querySelector('.scout-text')!;
  buttons = bubble.querySelector('.scout-actions')!;
  live = dock.querySelector('[aria-live]')!;
  drawAvatar();
  // a theme switch redraws him in the other outfit, keeping whatever mood he was in
  addEventListener('fh:theme', () => {
    if (currentTheme() === wearing) return;
    const was = avatar.getState().state ?? 'idle';
    avatar.destroy();
    drawAvatar(was);
    if (hidden) avatar.pause();
  });
  Object.assign(pos, home(), { vx: 0, vy: 0 });
  Object.assign(goal, home());
  place();

  bubble.querySelector('.scout-x')!.addEventListener('click', () => quiet());
  dock.querySelector('.scout-hide')!.addEventListener('click', () => setHidden(true));
  tab.addEventListener('click', () => setHidden(false));

  let pokes = 0, pokeReset = 0;
  dock.querySelector('.scout-body')!.addEventListener('click', () => {
    pokes += 1;
    clearTimeout(pokeReset);
    pokeReset = window.setTimeout(() => { pokes = 0; }, 20000);
    if (pokes >= 8) { say(line('pokeTooMuch'), { state: 'sleeping', ms: 4000, priority: true }); return; }
    avatar.poke(pokes >= 5 ? 'spin' : 'bounce');
    // the third poke in a row, once per visit, buys a secret: where the old design lives
    if (pokes === 3 && !oldTold) { oldTold = true; import('./eggs').then((m) => m.oldSecret()); return; }
    say(pokes >= 5 ? line('pokeTooMuch') : line('poke'), { state: pokes >= 5 ? 'angry' : 'playful', ms: 3500, priority: true });
  });

  addEventListener('resize', () => { if (!attached) aimHome(); else kick(); });
  document.addEventListener('visibilitychange', () => (document.hidden ? avatar.pause() : !reduced && avatar.resume()));

  if (store.get(HIDE_KEY) === '1') setHidden(true, true);
  requestAnimationFrame(() => dock.classList.add('in'));
}

function setHidden(on: boolean, silent = false) {
  if (!mounted) mount();
  if (on) {
    if (!silent) say(line('hide'), { state: 'sad', ms: 1800, priority: true });
    setTimeout(() => { hidden = true; dock.classList.add('gone'); tab.hidden = false; avatar.pause(); }, silent ? 0 : 1700);
    store.set(HIDE_KEY, '1');
  } else {
    hidden = false;
    store.set(HIDE_KEY, '0');
    tab.hidden = true;
    dock.classList.remove('gone');
    if (!reduced) avatar.resume();
    say(line('unhide'), { state: 'excited', gesture: 'bounce', ms: 3200, priority: true });
  }
}

// ---------------- speech ----------------
export function say(message: string, opts: SayOpts = {}) {
  if (!mounted) mount();
  if (hidden && !opts.priority) return;
  // unsolicited chatter is rate-limited; replies to the visitor (priority) always get through
  const now = Date.now();
  if (!opts.priority && !bubble.hidden && now - lastSaid < 4500) return;
  lastSaid = now;
  clearTimeout(hideT);
  clearInterval(typeT);
  dock.classList.add('in', 'talking');
  live.textContent = message;
  buttons.textContent = '';
  bubble.hidden = false;
  place();
  if (opts.state) avatar.setState(opts.state);
  if (opts.gesture) avatar.poke(opts.gesture);
  // a beat of "..." first, then the line types itself out
  text.textContent = '';
  text.classList.add('typing');
  const startTyping = () => {
    text.classList.remove('typing');
    let i = 0;
    const chars = [...message];
    if (reduced) { text.textContent = message; }
    else typeT = window.setInterval(() => {
      i += 2;
      text.textContent = chars.slice(0, i).join('');
      if (i >= chars.length) { clearInterval(typeT); text.textContent = message; }
    }, 22);
    (opts.actions ?? []).forEach((a) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = a.label;
      b.addEventListener('click', () => a.onClick?.());
      buttons.appendChild(b);
    });
  };
  typeT = window.setTimeout(startTyping, reduced ? 0 : 380);
  // on a phone the bubble sits over the content, so it leaves sooner
  if (!opts.stay) hideT = window.setTimeout(quiet, ((opts.ms ?? 5000) + message.length * 12) * (innerWidth < 600 ? 0.7 : 1));
}

export function quiet() {
  if (!mounted) return;
  bubble.hidden = true;
  dock.classList.remove('talking');
  avatar.setState('idle');
}
export function setState(s: string) { if (!mounted) mount(); avatar.setState(s); }
export function poke(g: 'nod' | 'bounce' | 'spin') { if (!mounted) mount(); avatar.poke(g); }
export function pin() { if (!mounted) mount(); pinned = true; roaming = false; aimHome(); }

// ---------------- roaming ----------------
let lastPerch = 0, lastKey = '';
function visibleTargets() {
  return [...document.querySelectorAll<HTMLElement>('[data-scout]')].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.top > 90 && r.bottom < innerHeight - 40 && r.top < innerHeight * 0.75 && el.dataset.scout !== lastKey;
  });
}
function perch(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const room = { right: innerWidth - r.right, left: r.left };
  const forced = el.dataset.scoutSide as 'left' | 'right' | 'top' | undefined;
  const side = forced ?? (room.right > size() + 40 ? 'right' : room.left > size() + 40 ? 'left' : 'top');
  attached = { el, side, dy: Math.min(r.height * 0.25, 40) - size() / 2 + 10 };
  dock.classList.remove('perched');
  lastPerch = Date.now();
  lastKey = el.dataset.scout!;
  kick();
  // look at what it perched on
  avatar.setLookAt(side === 'top' ? [-0.3, 0.8] : [side === 'right' ? -0.7 : 0.7, 0.1]);
  setTimeout(() => avatar.setLookAt(null), 2600);
  const key = `at_${el.dataset.scout}`;
  if (hasLine(key) && Math.random() < 0.75) setTimeout(() => say(line(key as LineKey), { state: pick(['curious', 'happy', 'playful', 'proud']), ms: 4200 }), reduced ? 0 : 700);
}
function maybeRoam() {
  if (!roaming || hidden || pinned) return;
  if (Date.now() - lastPerch < 6500) return;
  const list = visibleTargets();
  if (!list.length || Math.random() < 0.25) return;
  perch(pick(list));
}

// ---------------- lingering and reactions ----------------
let lingerT: number[] = [];
let sectionKey = 'default';
function currentSection() {
  const mid = innerHeight / 2;
  const sec = [...document.querySelectorAll<HTMLElement>('main section[id], main footer[id], footer[id]')].find((s) => {
    const r = s.getBoundingClientRect();
    return r.top <= mid && r.bottom >= mid;
  });
  const page = pageKind();
  if (page !== 'home') return page;
  const id = sec?.id ?? 'top';
  return ({ top: 'top', engage: 'engage', about: 'about', record: 'record', projects: 'projects', 'lab-invite': 'lab', toolkit: 'toolkit', journey: 'journey', contact: 'contact' } as Record<string, string>)[id] ?? 'default';
}
function armLinger() {
  lingerT.forEach(clearTimeout);
  sectionKey = currentSection();
  const k = `linger_${sectionKey}`;
  const key = (hasLine(k) ? k : 'linger_default') as LineKey;
  const vars = { count: document.querySelector('[data-writeup-count]')?.getAttribute('data-writeup-count') ?? '' };
  lingerT = [
    window.setTimeout(() => say(line(key, vars), { state: 'curious', ms: 5200 }), 14000),
    window.setTimeout(() => say(line(key, vars), { state: 'bored', ms: 5200 }), 32000),
    window.setTimeout(() => { say(line('tantrum'), { state: 'angry', gesture: 'spin', ms: 5000 }); if (roaming) tantrumLaps(); }, 60000),
    window.setTimeout(() => { quiet(); avatar.setState('sleeping'); dozing = true; }, 90000),
  ];
}
let dozing = false;
function tantrumLaps() {
  if (reduced) return;
  const pts = [[innerWidth * 0.2, innerHeight * 0.3], [innerWidth * 0.75, innerHeight * 0.25], [innerWidth * 0.6, innerHeight * 0.7], [home().x, home().y]];
  attached = null;
  pts.forEach(([x, y], i) => setTimeout(() => { goal.x = x; goal.y = y; dock.classList.remove('perched'); kick(); }, i * 900));
}
function wake() {
  if (dozing) { dozing = false; say(line('wake'), { state: 'waking', ms: 2600, priority: true }); }
}

function pageKind() {
  const p = location.pathname;
  if (/\/404(\.html)?$/.test(p) || document.title.startsWith('Page not found')) return '404';
  if (p.startsWith('/writeups/') && p.length > '/writeups/'.length && !p.endsWith('/index.html')) return 'writeup';
  if (p.startsWith('/writeups')) return 'hub';
  if (p === '/lab/' || p === '/lab/index.html') return 'lab';
  if (p.startsWith('/lab/')) return 'room';
  if (p.startsWith('/vault')) return 'vault';
  return 'home';
}

// ---------------- boot: called on every page ----------------
export function boot() {
  const kind = pageKind();
  mount();
  if (kind === 'room' || pinned) { pin(); return; }
  roaming = finePointer && innerWidth >= 1024;
  if (import.meta.env.DEV) (window as any).__scout = { get roaming() { return roaming; }, get attached() { return attached; }, get lastPerch() { return lastPerch; }, get section() { return sectionKey; }, perch, maybeRoam };

  const visits = Number(store.get(VISITS_KEY) || '0') + 1;
  store.set(VISITS_KEY, String(visits));

  // greeting
  setTimeout(() => {
    if (kind === 'writeup') say(line('writeupHello', { title: document.querySelector('h1')?.textContent?.trim() ?? 'this one' }), { state: 'happy', gesture: 'nod' });
    else if (kind === 'hub') say(line('hubHello'), { state: 'happy' });
    else if (kind === '404') say(line('notFound'), { state: 'confused' });
    else if (kind === 'home') {
      const h = new Date().getHours();
      if (h < 5) say(line('night', { time: clock() }), { state: 'drowsy' });
      else say(visits > 1 ? line('helloBack', { n: visits }) : line('hello'), { state: 'excited', gesture: 'bounce' });
    }
  }, kind === 'home' ? 3400 : 1600);

  // scroll: roam once it settles, re-arm the lingering timers, notice speeding
  let settleT = 0, lastY = scrollY, lastT = performance.now(), speedNag = 0;
  addEventListener('scroll', () => {
    const now = performance.now();
    const v = Math.abs(scrollY - lastY) / Math.max(1, now - lastT);
    lastY = scrollY; lastT = now;
    if (v > 6 && Date.now() - speedNag > 25000) { speedNag = Date.now(); say(line('speed'), { state: 'surprised', ms: 3200 }); }
    if (attached) kick();
    wake();
    clearTimeout(settleT);
    settleT = window.setTimeout(() => { maybeRoam(); armLinger(); }, 650);
  }, { passive: true });
  armLinger();
  ['pointermove', 'keydown', 'touchstart'].forEach((ev) => addEventListener(ev, () => { if (dozing) { wake(); armLinger(); } }, { passive: true }));

  // reactions
  let copied = 0;
  document.addEventListener('copy', (e) => {
    if ((e.target as Element)?.closest?.('pre, .term, input')) return;
    if (Date.now() - copied > 30000) { copied = Date.now(); say(line('copy'), { state: 'suspicious', ms: 3600, priority: true }); }
  });
  let inspected = false;
  document.addEventListener('contextmenu', (e) => {
    if (inspected || (e.target as Element)?.closest?.('canvas, a, img')) return;
    inspected = true;
    say(line('inspect'), { state: 'curious', ms: 5200, priority: true });
  });
  if (finePointer) {
    let exited = sessionStorage.getItem('fh-exit') === '1';
    document.addEventListener('mouseout', (e) => {
      if (exited || e.relatedTarget || e.clientY > 4) return;
      exited = true;
      try { sessionStorage.setItem('fh-exit', '1'); } catch { /* fine */ }
      say(line('exit'), { state: 'sad', ms: 4500, priority: true });
    });
  }
  let awayAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) awayAt = Date.now();
    else if (awayAt && Date.now() - awayAt > 20000) setTimeout(() => say(line('back'), { state: 'happy', priority: true }), 600);
  });
  let resized = 0, rzT = 0;
  addEventListener('resize', () => {
    clearTimeout(rzT);
    rzT = window.setTimeout(() => { if (Date.now() - resized > 60000) { resized = Date.now(); say(line('resize'), { state: 'proud', ms: 3200 }); } }, 500);
  });
  addEventListener('fh:theme', (e) => say(line((e as CustomEvent).detail === 'dark' ? 'themeDark' : 'themeLight'), { state: 'playful', gesture: 'nod', ms: 3200, priority: true }));
  const contact = document.getElementById('contact');
  if (contact && kind === 'home') {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const email = contact.querySelector<HTMLElement>('[data-scout="email"]');
      if (roaming && email) { lastPerch = 0; perch(email); setTimeout(() => say(line('contactReached'), { state: 'celebrate', gesture: 'spin', ms: 5000, priority: true }), 1600); }
      else say(line('contactReached'), { state: 'celebrate', gesture: 'spin', ms: 5000 });
    }, { threshold: 0.35 });
    io.observe(contact);
  }
}
