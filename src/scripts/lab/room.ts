import { animate, stagger, utils } from 'animejs';
import { roomBySlug, countQuestions, IP, type Room, type Act, type Page } from '../../data/rooms';
import { Terminal, type TermSnap } from './terminal';
import { Browser, type BrwSnap } from './browser';
import { getRoom, saveRoom, resetRoom, award, type BadgeId, BADGES } from './state';
import { reduced } from '../motion';
import { line as quip, clock } from '../lines';

const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll(s)] as T[];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const fmt = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;

// Scout loads lazily: the avatar engine only downloads once there is something to say
type ScoutMod = typeof import('../scout');
let scoutMod: Promise<ScoutMod> | null = null;
const scout = () => (scoutMod ??= import('../scout').then((m) => { m.pin(); return m; }));
const say = (text: string, opts: Parameters<ScoutMod['say']>[1] = {}) => { scout().then((m) => m.say(text, opts)); };

export function initRoom() {
  const page = $('#room');
  const room = roomBySlug(page.dataset.slug!)!;
  const total = countQuestions(room);
  let save = getRoom(room.slug);

  const tokens = new Set<string>();
  const files = new Map<string, string>();
  let machine: 'off' | 'deploying' | 'on' = 'off';
  let boxUp = false;
  let startedAt = 0;
  let clockStart = 0;
  let strikes = 0;
  let locked = false;
  let finished = !!save.done;
  let tick = 0;
  let rightStreak = 0;
  let wrongStreak = 0;
  const terms: Terminal[] = [];
  const asks = new Map<Terminal, Act['ask']>();
  const shells = new Map<Terminal, string>();
  let browser: Browser | null = null;

  // ---------------- questions ----------------
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/^port\s+/, '');
  function paintQuestions() {
    $$<HTMLFormElement>('.q').forEach((f) => {
      const ok = save.answered.includes(f.dataset.id!);
      f.classList.toggle('ok', ok);
      const input = $<HTMLInputElement>('input', f);
      const btn = $<HTMLButtonElement>('button[type=submit]', f);
      input.disabled = ok;
      btn.disabled = ok;
      btn.textContent = ok ? 'Correct' : 'Submit';
      if (ok && !input.value) input.value = f.dataset.answer!;
    });
    $$('.task').forEach((t) => {
      const qs = $$('.q', t);
      const was = t.classList.contains('done');
      const now = qs.length > 0 && qs.every((q) => q.classList.contains('ok'));
      t.classList.toggle('done', now);
      // a task that just got finished folds away and the next one opens, after a beat to see the tick
      if (now && !was && accordionReady) setTimeout(() => advanceFrom(t), 700);
    });
    const n = save.answered.length;
    $('#prog-n').textContent = `${n} of ${total}`;
    $('#prog-bar').style.transform = `scaleX(${n / total})`;
  }

  // ---------------- tasks as an accordion: one open at a time, opening and closing smoothly ----------------
  let accordionReady = false;
  const tasksEls = $$<HTMLLIElement>('.task');
  const detailsOf = (t: HTMLElement) => $<HTMLDetailsElement>('details', t);
  function setOpen(d: HTMLDetailsElement, open: boolean, animated = true) {
    const body = $<HTMLElement>('.task-body', d);
    if (open === d.open && !d.dataset.closing) return Promise.resolve();
    if (!animated || reduced) { d.open = open; delete d.dataset.closing; return Promise.resolve(); }
    if (open) {
      delete d.dataset.closing;
      d.open = true;
      const h = body.scrollHeight;
      body.style.overflow = 'hidden';
      return animate(body, { height: [0, h], paddingBottom: ['0px', '18px'], opacity: [0, 1], duration: 460, ease: 'outQuart' }).then(() => { body.style.height = ''; body.style.paddingBottom = ''; body.style.overflow = ''; });
    }
    d.dataset.closing = '1';
    body.style.overflow = 'hidden';
    return animate(body, { height: [body.offsetHeight, 0], paddingBottom: ['18px', '0px'], opacity: [1, 0], duration: 360, ease: 'inOutQuad' }).then(() => {
      if (!d.dataset.closing) return;
      d.open = false;
      delete d.dataset.closing;
      body.style.height = ''; body.style.paddingBottom = ''; body.style.opacity = ''; body.style.overflow = '';
    });
  }
  function focusTask(t: HTMLElement, scroll = true) {
    tasksEls.forEach((o) => { if (o !== t) setOpen(detailsOf(o), false); });
    setOpen(detailsOf(t), true).then(() => {
      if (!scroll) return;
      const r = t.getBoundingClientRect();
      if (r.top < 90 || r.top > innerHeight * 0.6) {
        const y = r.top + scrollY - 100;
        const lenis = (window as unknown as { __lenis?: { scrollTo: (y: number, o?: object) => void } }).__lenis;
        if (lenis) lenis.scrollTo(y, { duration: 0.8 }); else scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
      }
      if (matchMedia('(pointer: fine)').matches) $<HTMLInputElement>('.q:not(.ok) input', t)?.focus({ preventScroll: true });
    });
  }
  function advanceFrom(t: HTMLElement) {
    const i = tasksEls.indexOf(t as HTMLLIElement);
    const next = [...tasksEls.slice(i + 1), ...tasksEls.slice(0, i)].find((o) => !o.classList.contains('done'));
    if (next) focusTask(next);
    else setOpen(detailsOf(t), false);
  }
  tasksEls.forEach((t) => {
    $('summary', t).addEventListener('click', (e) => {
      e.preventDefault();
      const d = detailsOf(t);
      if (d.open && !d.dataset.closing) setOpen(d, false);
      else focusTask(t, false);
    });
  });

  $$<HTMLFormElement>('.q').forEach((f) => {
    const [ti, qi] = f.dataset.id!.split('-').map(Number);
    const q = room.tasks[ti].questions[qi];
    f.dataset.answer = q.a[0];
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      if (locked) return say(quip('lockout'), { state: 'sad' });
      const input = $<HTMLInputElement>('input', f);
      const v = input.value;
      if (!v.trim()) return;
      if (ti === 0 && machine !== 'on') {
        input.value = '';
        return say(quip('noMachine'), { state: 'curious' });
      }
      const good = q.a.some((a) => (q.flag ? v.trim() === a : norm(v) === norm(a)));
      if (good) {
        save.answered = [...new Set([...save.answered, f.dataset.id!])];
        saveRoom(room.slug, save);
        paintQuestions();
        wrongStreak = 0;
        rightStreak += 1;
        if (save.answered.length >= total) finishRoom();
        else if (rightStreak === 3) say(quip('correctStreak'), { state: 'proud', gesture: 'bounce', ms: 3200 });
        else say(quip('correct'), { state: 'happy', gesture: 'nod', ms: 2600 });
      } else {
        f.classList.remove('bad'); void f.offsetWidth; f.classList.add('bad');
        rightStreak = 0;
        wrongStreak += 1;
        if (room.strikes && q.flag) strike('wrong flag submitted.');
        else if (wrongStreak >= 3 && room.hints && room.tasks[ti].hint && (f.closest('.task-body')?.querySelector('.hint') as HTMLElement | null)?.hidden) say(quip('wrongHint'), { state: 'curious', ms: 4500 });
        else if (wrongStreak >= 3) say(quip('wrongStreak'), { state: 'thinking', ms: 4200 });
        else say(quip('wrong'), { state: 'confused', ms: 3000 });
      }
    });
  });

  // hints (counted, like a real room)
  $$<HTMLButtonElement>('.hint-btn').forEach((b) => b.addEventListener('click', () => {
    const box = b.nextElementSibling as HTMLElement;
    if (!box.hidden) return;
    box.hidden = false;
    b.disabled = true;
    save.hints += 1;
    saveRoom(room.slug, save);
    $('#hints-n').textContent = String(save.hints);
  }));

  // ---------------- session (survives a refresh, not a closed tab) ----------------
  // sessionStorage is per tab: an accidental reload brings everything back, closing the tab starts fresh
  const SKEY = 'fh-lab-session:' + room.slug;
  type TabSnap = { kind: 'term'; label: string; t: TermSnap; shell: string | null } | { kind: 'brw'; label: string; b: BrwSnap };
  type Session = { machine: 'on' | 'off'; startedAt: number; boxUp: boolean; tokens: string[]; files: [string, string][]; env: Record<string, string>; strikes: number; clockStart: number; seq: number; tabs: TabSnap[]; active: number };
  let sessionDead = false;
  let saveT = 0;
  function persist() {
    if (sessionDead) return;
    clearTimeout(saveT);
    saveT = window.setTimeout(() => {
      if (sessionDead) return;
      const order = orderedTabs();
      const data: Session = {
        machine: machine === 'on' ? 'on' : 'off', startedAt, boxUp, tokens: [...tokens], files: [...files], env, strikes, clockStart, seq: termSeq,
        tabs: order.map((t) => t.kind === 'term'
          ? { kind: 'term', label: t.label, t: t.term!.snapshot(), shell: shells.get(t.term!) ?? null }
          : { kind: 'brw', label: t.label, b: t.browser!.snapshot() }),
        active: Math.max(0, order.findIndex((t) => t.id === activeId)),
      };
      try { sessionStorage.setItem(SKEY, JSON.stringify(data)); } catch { /* not remembered, still playable */ }
    }, 150);
  }
  function clearSession() { sessionDead = true; clearTimeout(saveT); try { sessionStorage.removeItem(SKEY); } catch { /* nothing to clear */ } }
  // a saved session is only trusted after its shape checks out, so a hand-edited one cannot break the page
  function readSession(): Session | null {
    try {
      const s = JSON.parse(sessionStorage.getItem(SKEY) || 'null');
      if (!s || typeof s !== 'object' || !Array.isArray(s.tabs)) return null;
      const str = (v: unknown, n = 2000) => (typeof v === 'string' ? v.slice(0, n) : '');
      const strs = (v: unknown, n = 200) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(-n).map((x: string) => x.slice(0, 2000)) : []);
      const CLS = new Set(['', 'c', 'a', 'm', 'r', 'y', 'ok']);
      const tabsIn: TabSnap[] = [];
      for (const t of s.tabs.slice(0, 6)) {
        if (t?.kind === 'term' && t.t && Array.isArray(t.t.lines)) {
          const lines = t.t.lines.filter((l: unknown) => Array.isArray(l) && CLS.has(l[0]) && typeof l[1] === 'string').slice(-200).map((l: [string, string]) => [l[0], l[1].slice(0, 4000)] as [string, string]);
          tabsIn.push({ kind: 'term', label: str(t.label, 24) || 'Terminal', t: { lines, cwd: /^~(\/(wordlists|tools))?$/.test(t.t.cwd) ? t.t.cwd : '~', user: /^[a-z]+@[a-z-]+$/.test(t.t.user) ? t.t.user : 'attacker@labbox', hist: strs(t.t.hist, 100) }, shell: typeof t.shell === 'string' && /^[a-z]+@[a-z-]+$/.test(t.shell) ? t.shell : null });
        } else if (t?.kind === 'brw' && t.b) {
          tabsIn.push({ kind: 'brw', label: str(t.label, 24) || 'Browser', b: { hist: strs(t.b.hist, 30), pos: Number.isInteger(t.b.pos) ? t.b.pos : -1 } });
        }
      }
      const env: Record<string, string> = {};
      if (s.env && typeof s.env === 'object') for (const [k, v] of Object.entries(s.env)) if (/^[A-Za-z_][A-Za-z0-9_]{0,31}$/.test(k) && typeof v === 'string') env[k] = v.slice(0, 200);
      const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
      return {
        machine: s.machine === 'on' ? 'on' : 'off', startedAt: num(s.startedAt), boxUp: s.boxUp === true && tabsIn.length > 0,
        tokens: strs(s.tokens, 50), files: Array.isArray(s.files) ? s.files.filter((f: unknown) => Array.isArray(f) && typeof f[0] === 'string' && typeof f[1] === 'string').slice(0, 20) : [],
        env, strikes: Math.min(num(s.strikes), room.strikes || 0), clockStart: num(s.clockStart), seq: num(s.seq), tabs: tabsIn, active: num(s.active),
      };
    } catch { return null; }
  }

  // shell variables: $TARGET points at the box, so "nmap $TARGET" works like on a real lab VPN
  const LHOST = '10.10.14.7';
  let env: Record<string, string> = { TARGET: IP, LHOST, USER: 'attacker', HOME: '/home/attacker', SHELL: '/bin/zsh' };

  // ---------------- machine ----------------
  const status = $('#m-status');
  const startM = $<HTMLButtonElement>('#m-start');
  const prog = $('#m-prog');
  const upEl = $('#m-up');
  let upT = 0;
  function setStatus(text: string, cls = '') { status.textContent = text; status.className = 'm-status ' + cls; }
  function showUp() {
    machine = 'on';
    startM.textContent = 'Machine running';
    startM.disabled = true;
    $('#m-ip').textContent = IP;
    $('#m-ip-wrap').hidden = false;
    setStatus('Target is up', 'on');
    prog.hidden = true;
    upEl.hidden = false;
    clearInterval(upT);
    const paint = () => { upEl.textContent = 'up ' + fmt((Date.now() - startedAt) / 1000); };
    paint();
    upT = window.setInterval(paint, 1000);
  }
  // the IP in the bar copies on click
  $<HTMLButtonElement>('#m-ip').addEventListener('click', async (e) => {
    const b = e.currentTarget as HTMLButtonElement;
    try { await navigator.clipboard.writeText(IP); b.dataset.copied = ''; setTimeout(() => delete b.dataset.copied, 1200); } catch { /* clipboard blocked */ }
  });
  const upNotice = (t: Terminal) => {
    t.print(`[+] Target is up at ${IP}`, 'ok');
    t.print('    Saved as $TARGET, so "nmap $TARGET" works. Plain "target" resolves too.', 'm');
  };

  function startMachine(quick = false) {
    if (machine !== 'off') return Promise.resolve();
    machine = 'deploying';
    startM.disabled = true;
    startM.textContent = 'Deploying…';
    const stages = ['Allocating a slot on the lab network', 'Booting the target image', 'Assigning an IP address', 'Running health checks'];
    const step = quick || reduced ? 250 : 1000;
    prog.hidden = false;
    prog.style.setProperty('--ms', `${step * stages.length}ms`);
    prog.classList.remove('run'); void prog.offsetWidth; prog.classList.add('run');
    let i = 0;
    setStatus(stages[0] + '…', 'busy');
    return new Promise<void>((res) => {
      const iv = setInterval(() => {
        i += 1;
        if (i < stages.length) return setStatus(stages[i] + '…', 'busy');
        clearInterval(iv);
        startedAt = Date.now();
        showUp();
        terms.forEach(upNotice);
        persist();
        say(quip(room.level === 'Hard' ? 'machineUpHard' : 'machineUp'), { state: room.level === 'Hard' ? 'suspicious' : 'excited', ms: 3800 });
        res();
      }, step);
    });
  }
  startM.addEventListener('click', () => startMachine());

  // commands fired at a machine that is off: Scout points at the button, getting more suspicious each time
  let offTries = 0;
  function nudgeMachine() {
    offTries += 1;
    startM.classList.remove('nudge'); void startM.offsetWidth; startM.classList.add('nudge');
    const lines = [
      'You forgot to start the machine. The button up top, the one literally saying Start machine.',
      'Still off. Are you doing this on purpose? Hacking a computer that does not exist is advanced, I admit.',
      'Third time. I am starting to think you just enjoy reading "Network is unreachable".',
      'Okay, I will hold your hand. Press the button, or press mine.',
    ];
    say(lines[Math.min(offTries, lines.length) - 1], {
      state: offTries === 1 ? 'curious' : offTries === 2 ? 'suspicious' : 'angry', gesture: offTries > 2 ? 'spin' : 'nod', ms: 6000, priority: true,
      actions: [{ label: 'Start it for me', onClick: () => { startMachine(); } }],
    });
  }

  // ---------------- the box ----------------
  const desk = $('#desk');
  const tabs = $('#tabs');
  const panes = $('#panes');
  const newBtn = $<HTMLButtonElement>('#tab-new');
  type Tab = { id: number; kind: 'term' | 'brw'; label: string; tab: HTMLButtonElement; pane: HTMLElement; term?: Terminal; browser?: Browser };
  const registry: Tab[] = [];
  let activeId = -1;
  let tabSeq = 0;
  let termSeq = 0;
  const orderedTabs = () => [...tabs.querySelectorAll<HTMLButtonElement>('.tab')].map((el) => registry.find((t) => t.tab === el)!).filter(Boolean);

  function bootBox(quick = false) {
    if (boxUp) return Promise.resolve();
    boxUp = true;
    $('#box-start').hidden = true;
    const boot = $('#boot');
    boot.hidden = false;
    boot.textContent = '';
    const lines: [string, string][] = [
      ['', 'labbox login: attacker (automatic login)'],
      ['ok', 'Started network manager'],
      ['ok', `Connected to the lab VPN · tun0 ${LHOST}`],
      ['ok', 'Mounted /usr/share/wordlists'],
      ['ok', 'Loaded tools: nmap curl wget nc ssh hashcat john'],
      ['ok', machine === 'on' ? `Route to target ${IP} · exported $TARGET` : 'Waiting for a target (start the machine above)'],
      ['', 'Welcome to the lab box.'],
    ];
    return new Promise<void>((res) => {
      let i = 0;
      const stepFn = () => {
        if (i < lines.length) {
          const [k, text] = lines[i++];
          const d = document.createElement('div');
          if (k === 'ok') { const m = document.createElement('span'); m.className = 'ok'; m.textContent = '[  OK  ] '; d.appendChild(m); }
          d.appendChild(document.createTextNode(text));
          boot.appendChild(d);
          setTimeout(stepFn, quick || reduced ? 50 : 260);
        } else {
          boot.hidden = true;
          desk.hidden = false;
          newTerminal();
          if (room.site) addBrowser();
          showTab(orderedTabs()[0].id);
          persist();
          res();
        }
      };
      stepFn();
    });
  }
  $('#box-start').addEventListener('click', () => bootBox());

  function addTab(t: Omit<Tab, 'tab' | 'id'>) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab' + (t.kind === 'brw' ? ' tab-brw' : '');
    b.setAttribute('role', 'tab');
    b.title = 'Drag to reorder';
    const ic = document.createElement('span');
    ic.className = 'tab-ic';
    ic.setAttribute('aria-hidden', 'true');
    ic.textContent = t.kind === 'term' ? '>_' : '◍';
    const lb = document.createElement('span');
    lb.className = 'tab-l';
    lb.textContent = t.label;
    const x = document.createElement('span');
    x.className = 'tab-x';
    x.textContent = '×';
    x.setAttribute('aria-label', 'Close tab');
    b.append(ic, lb, x);
    tabs.insertBefore(b, newBtn);
    const rec: Tab = { ...t, id: ++tabSeq, tab: b };
    registry.push(rec);
    b.addEventListener('click', (e) => {
      if (dragged) return;
      if ((e.target as HTMLElement).classList.contains('tab-x')) return closeTab(rec);
      showTab(rec.id);
    });
    b.addEventListener('auxclick', (e) => { if (e.button === 1) { e.preventDefault(); closeTab(rec); } });
    b.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); nudge(rec, e.key === 'ArrowLeft' ? -1 : 1); }
    });
    draggable(rec);
    paintClosers();
    return rec;
  }
  function setLabel(rec: Tab, label: string) {
    rec.label = label.slice(0, 24);
    rec.tab.querySelector('.tab-l')!.textContent = rec.label;
  }
  // the last tab cannot be closed, so the box never ends up empty
  function paintClosers() { const one = registry.length <= 1; registry.forEach((t) => ((t.tab.querySelector('.tab-x') as HTMLElement).hidden = one)); }
  function closeTab(rec: Tab) {
    if (registry.length <= 1) return;
    const order = orderedTabs();
    const at = order.indexOf(rec);
    if (rec.term) { terms.splice(terms.indexOf(rec.term), 1); shells.delete(rec.term); asks.delete(rec.term); }
    if (rec.browser && browser === rec.browser) browser = (registry.find((t) => t.browser && t !== rec)?.browser) ?? null;
    registry.splice(registry.indexOf(rec), 1);
    rec.pane.remove();
    rec.tab.remove();
    paintClosers();
    if (activeId === rec.id) { const next = orderedTabs()[Math.min(at, registry.length - 1)]; showTab(next.id); }
    persist();
  }
  function showTab(id: number) {
    activeId = id;
    registry.forEach((t) => { t.tab.setAttribute('aria-selected', String(t.id === id)); t.pane.hidden = t.id !== id; });
    registry.find((t) => t.id === id)?.term?.focus();
    persist();
  }

  // tabs drag sideways to reorder, like a real browser; neighbours slide out of the way
  let dragged = false;
  function draggable(rec: Tab) {
    const el = rec.tab;
    let startX = 0, dx = 0, on = false, id = -1;
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      dx = e.clientX - startX;
      if (!on) {
        if (Math.abs(dx) < 6) return;
        on = true; dragged = true;
        el.classList.add('dragging');
      }
      // a fast flick can pass several tabs in one move, so keep swapping until it settles
      for (let guard = 0; guard < 8; guard++) {
        const next = el.nextElementSibling as HTMLElement | null;
        const prev = el.previousElementSibling as HTMLElement | null;
        if (next?.classList.contains('tab') && dx > next.offsetWidth / 2) { const w = next.offsetWidth + 2; slide(next, () => tabs.insertBefore(next, el)); startX += w; }
        else if (prev?.classList.contains('tab') && -dx > prev.offsetWidth / 2) { const w = prev.offsetWidth + 2; slide(prev, () => tabs.insertBefore(el, prev)); startX -= w; }
        else break;
        dx = e.clientX - startX;
      }
      el.style.transform = `translateX(${dx}px)`;
    };
    const end = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1;
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', end);
      removeEventListener('pointercancel', end);
      if (!on) return;
      on = false;
      el.classList.remove('dragging');
      if (reduced) el.style.transform = '';
      else animate(el, { x: [dx, 0], duration: 260, ease: 'outQuart', onComplete: () => { el.style.transform = ''; } });
      persist();
      // the click that ends a drag should not also switch tabs
      setTimeout(() => { dragged = false; }, 0);
    };
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || (e.target as HTMLElement).classList.contains('tab-x')) return;
      id = e.pointerId; startX = e.clientX; dx = 0; on = false;
      // listen on the window: before the drag starts, the pointer may already be over a neighbour
      addEventListener('pointermove', move);
      addEventListener('pointerup', end);
      addEventListener('pointercancel', end);
    });
  }
  // move a neighbour, then glide it from where it was (FLIP)
  function slide(el: HTMLElement, move: () => void) {
    const before = el.getBoundingClientRect().left;
    move();
    const after = el.getBoundingClientRect().left;
    if (!reduced) animate(el, { x: [before - after, 0], duration: 220, ease: 'outQuart' });
  }
  function nudge(rec: Tab, dir: -1 | 1) {
    const sib = (dir < 0 ? rec.tab.previousElementSibling : rec.tab.nextElementSibling) as HTMLElement | null;
    if (!sib || !sib.classList.contains('tab')) return;
    slide(sib, () => (dir < 0 ? tabs.insertBefore(rec.tab, sib) : tabs.insertBefore(sib, rec.tab)));
    rec.tab.focus();
    persist();
  }

  function newTerminal(snap?: TabSnap & { kind: 'term' }) {
    const pane = document.createElement('div');
    pane.className = 'pane';
    panes.appendChild(pane);
    const term = new Terminal(pane, { onCommand: run, complete: completeWord });
    terms.push(term);
    let label: string;
    if (snap) {
      label = snap.label;
      term.restore(snap.t);
      if (snap.shell) shells.set(term, snap.shell);
    } else {
      label = `Terminal ${++termSeq}`;
      room.boot.forEach((l) => term.print(l, 'm'));
      if (machine === 'on') upNotice(term);
      else term.print('Machine is off. Start it from the bar above; its IP will be saved as $TARGET.', 'y');
    }
    const rec = addTab({ kind: 'term', label, pane, term });
    if (!snap) showTab(rec.id);
    return rec;
  }
  function addBrowser(snap?: TabSnap & { kind: 'brw' }) {
    const pane = document.createElement('div');
    pane.className = 'pane brw-pane';
    panes.appendChild(pane);
    let rec: Tab | null = null;
    const b = new Browser(pane, {
      site: room.site,
      onLoad: (p: Page) => {
        if (machine !== 'on') return;
        activity();
        if (p.strike) strike(p.strike);
        if (p.gives && (!p.needs || p.needs.every((t) => tokens.has(t)))) tokens.add(p.gives);
      },
      onLogin: (u, pw) => (room.login && u === room.login.user && pw === room.login.pass ? room.login.ok : null),
      onNav: (title) => { if (rec) setLabel(rec, title); persist(); },
    });
    browser ??= b;
    rec = addTab({ kind: 'brw', label: snap?.label ?? 'New tab', pane, browser: b });
    if (snap) b.restore(snap.b);
    return rec;
  }

  // the + button offers a terminal or a browser
  const menu = document.createElement('div');
  menu.className = 'tab-menu';
  menu.hidden = true;
  menu.setAttribute('role', 'menu');
  [['term', '>_  New terminal'], ['brw', '◍  New browser']].forEach(([k, label]) => {
    const it = document.createElement('button');
    it.type = 'button';
    it.setAttribute('role', 'menuitem');
    it.textContent = label;
    it.addEventListener('click', () => {
      menu.hidden = true;
      if (registry.length >= 6) return say(quip('tooManyTerms'), { state: 'bored' });
      const rec = k === 'term' ? newTerminal() : addBrowser();
      showTab(rec.id);
      if (k === 'brw') (rec.pane.querySelector('.brw-url input') as HTMLInputElement | null)?.focus();
    });
    menu.appendChild(it);
  });
  desk.appendChild(menu);
  newBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!room.site) { if (registry.length >= 6) return say(quip('tooManyTerms'), { state: 'bored' }); return showTab(newTerminal().id); }
    menu.hidden = !menu.hidden;
    if (!menu.hidden) {
      const r = newBtn.getBoundingClientRect(), d = desk.getBoundingClientRect();
      menu.style.left = `${Math.min(r.left - d.left, d.width - 180)}px`;
      menu.style.top = `${r.bottom - d.top + 4}px`;
      (menu.firstElementChild as HTMLElement).focus();
    }
  });
  document.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target as Node)) menu.hidden = true; });
  menu.addEventListener('keydown', (e) => { if (e.key === 'Escape') { menu.hidden = true; newBtn.focus(); } });

  // ---------------- commands ----------------
  const HOME = ['notes.txt', 'wordlists/', 'tools/'];
  const CMDS = ['nmap', 'curl', 'wget', 'nc', 'ssh', 'base64', 'echo', 'cat', 'ls', 'cd', 'pwd', 'whoami', 'id', 'clear', 'help', 'man', 'history', 'hashcat', 'john', 'tr', 'sudo', 'exit', 'neofetch', 'uname', 'export', 'env', 'printenv'];
  function completeWord(word: string, first: boolean, term: Terminal) {
    if (first) return CMDS;
    const inShell = shells.has(term);
    const local = inShell ? ['flag.txt', 'notes.md', '/root/flag.txt'] : term.cwd === '~/wordlists' ? ['rockyou-mini.txt'] : [...HOME, ...files.keys()];
    return [...local, 'target', '$TARGET', IP, 'http://target/', 'http://$TARGET/', 'target:8080/', '-p-', '-sV'].filter((c) => c.startsWith(word));
  }

  function run(raw: string, term: Terminal) {
    runCmd(raw, term);
    persist();
  }
  // $NAME and ${NAME} expand like in a real shell; text in single quotes is left alone
  const expand = (s: string) => s.split(/('[^']*')/).map((part) => (part.startsWith("'") ? part : part.replace(/\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?/g, (_, k) => env[k] ?? ''))).join('');
  function runCmd(raw: string, term: Terminal) {
    if (raw === '\u0003') { asks.delete(term); return; }
    const ask0 = asks.get(term);
    const line = (ask0 ? raw.trim() : expand(raw.trim())).replace(/\s+/g, ' ').slice(0, 300);
    activity();
    // password prompt for ssh
    const ask = asks.get(term);
    if (ask) {
      term.setSecret(false);
      asks.delete(term);
      if (ask.re.test(line)) {
        tokens.add(ask.gives);
        if (ask.shell) { shells.set(term, ask.shell); term.setUser(ask.shell); }
        term.print(ask.out, 'ok');
      } else {
        term.print('Permission denied, please try again.', 'r');
        strike('failed login.');
      }
      return;
    }
    if (!line) return;
    if (locked) return term.print('Connection to target lost. Restart the machine.', 'r');
    const name = line.split(' ')[0].toLowerCase();
    const inShell = shells.has(term);

    // things that work with or without the target
    if (name === 'clear') return term.clear();
    if (name === 'help') return help(term);
    if (name === 'history') return term.print('(use the ↑ and ↓ keys to scroll through your history)', 'm');
    if (name === 'man') return term.print(MAN[line.split(' ')[1]] ?? 'No manual entry. Try: man nmap', 'm');
    if (name === 'exit') {
      if (inShell) { shells.delete(term); term.setUser('attacker@labbox'); return term.print('Connection to target closed.', 'm'); }
      return term.print('There is no escape. (You can close the tab, though.)', 'm');
    }
    if (/^rm\s+-rf\s+\/(\s|$|\*)/.test(line)) { term.print('rm: refusing to remove "/" recursively (and so is Scout).', 'r'); return say(quip('rmrf'), { state: 'angry', gesture: 'spin' }); }
    if (/^sudo\s+make\s+me\s+a\s+sandwich/.test(line)) return term.print('Okay.', 'ok');
    if (name === 'neofetch') return term.print(NEOFETCH, 'a');
    if (name === 'env' || name === 'printenv') {
      const k = line.split(' ')[1];
      if (name === 'printenv' && k) return env[k] !== undefined ? term.print(env[k], 'a') : undefined;
      return term.print(Object.entries(env).map(([a, b]) => `${a}=${b}`).join('\n'), 'a');
    }
    if (name === 'export') {
      const m = raw.trim().match(/^export\s+([A-Za-z_][A-Za-z0-9_]{0,31})=(.*)$/);
      if (!m) return term.print('usage: export NAME=value   (try: export PORT=80, then echo $PORT)', 'm');
      env[m[1]] = expand(m[2].replace(/^["']|["']$/g, '')).slice(0, 200);
      return;
    }
    if (name === 'uname') return term.print('Linux labbox 6.11.3-arch1-1 x86_64 GNU/Linux', 'a');

    if (machine !== 'on') {
      if (/^(nmap|curl|wget|nc|ssh)$/.test(name)) {
        if (machine === 'deploying') return term.print('Target is still booting. Give it a second.', 'y');
        term.print('Network is unreachable. Start the machine first (top of the box).', 'r');
        return nudgeMachine();
      }
    } else if (room.limit && !clockStart) {
      clockStart = Date.now();
      startClock();
    }

    // flag submitted in the terminal
    const flagM = line.match(/^(?:submit\s+)?(FH\{[^}]*\})$/i);
    if (flagM) return term.print('Paste flags into the question box in the task list.', 'y');

    const hit = room.acts.find((a) => {
      if (!a.re.test(line)) return false;
      if (a.has && !line.includes(a.has)) return false;
      if (a.inShell && !inShell) return false;
      if (!a.inShell && inShell && /^(ls|cat|id|whoami)\b/.test(line)) return false;
      return (a.needs ?? []).every((n) => tokens.has(n));
    });
    if (hit && machine === 'on') {
      term.print(hit.out, hit.strike ? 'r' : 'a');
      if (hit.gives && !hit.ask) tokens.add(hit.gives);
      if (hit.save) { files.set(hit.save.name, hit.save.content); }
      if (hit.shell) { shells.set(term, hit.shell); term.setUser(hit.shell); }
      if (hit.ask) { asks.set(term, hit.ask); term.setSecret(true); }
      if (hit.strike) strike(hit.strike);
      if (hit.gives === 'flag') say(quip('flagFound'), { state: 'excited', gesture: 'bounce', ms: 4000 });
      return;
    }
    if (inShell) return shellLocal(line, name, term);
    local(line, name, term);
  }

  function shellLocal(line: string, name: string, term: Terminal) {
    if (name === 'pwd') return term.print('/home/' + shells.get(term)!.split('@')[0], 'a');
    if (name === 'whoami') return term.print(shells.get(term)!.split('@')[0], 'a');
    if (name === 'sudo') return term.print('Sorry, user may not run sudo on target.', 'r');
    if (name === 'cat') return term.print(`cat: ${line.split(' ')[1] ?? ''}: No such file or directory`, 'r');
    term.print(`${name}: command not found`, 'r');
  }

  function local(line: string, name: string, term: Terminal) {
    const arg = line.split(' ').slice(1).join(' ');
    if (name === 'whoami') return term.print('attacker', 'a');
    if (name === 'id') return term.print('uid=1000(attacker) gid=1000(attacker) groups=1000(attacker)', 'a');
    if (name === 'pwd') return term.print(term.cwd.replace('~', '/home/attacker'), 'a');
    if (name === 'cd') {
      if (!arg || arg === '~' || arg === '..') { term.cwd = '~'; term.renderPrompt(); return; }
      if (/^(\.\/)?(wordlists|tools)\/?$/.test(arg) && term.cwd === '~') { term.cwd = '~/' + arg.replace(/^\.\//, '').replace(/\/$/, ''); term.renderPrompt(); return; }
      return term.print(`cd: ${arg}: No such file or directory`, 'r');
    }
    if (name === 'ls') {
      if (term.cwd === '~/wordlists') return term.print('rockyou-mini.txt', 'a');
      if (term.cwd === '~/tools') return term.print('linpeas.sh  pspy64  reverse-shells.txt', 'a');
      return term.print([...HOME, ...files.keys()].join('   '), 'a');
    }
    if (name === 'cat') {
      if (arg === 'notes.txt' && term.cwd === '~') return term.print(`Lab box notes\n- the target is at ${IP}, saved as $TARGET (alias: target)\n- be nice to the IDS, it has feelings`, 'a');
      if (files.has(arg)) return term.print(files.get(arg)!, 'a');
      return term.print(`cat: ${arg}: No such file or directory`, 'r');
    }
    if (name === 'echo') return term.print(arg.replace(/^["']|["']$/g, ''), 'a');
    if (name === 'sudo') { term.print('attacker is not in the sudoers file. This incident will be reported.', 'r'); return say(quip('sudo'), { state: 'suspicious', ms: 3000 }); }
    const generic: Record<string, string> = {
      nmap: 'Failed to resolve host. Did you mean: nmap target', curl: 'curl: (22) The requested URL returned error: 404', wget: '404 Not Found',
      nc: 'nc: connect to target port failed: Connection refused', ssh: 'ssh: Permission denied (publickey,password).', base64: 'base64: nothing to decode',
      tr: 'tr: nothing to translate', hashcat: 'No hashes loaded.', john: 'No password hashes loaded.',
    };
    if (generic[name]) {
      term.print(generic[name], 'm');
      if (/^(nmap|curl|nc|ssh)$/.test(name) && machine === 'on') strike('pointless request logged.');
      return;
    }
    term.print(`${name}: command not found. Type help.`, 'r');
  }

  function help(term: Terminal) {
    term.print(`Target: ${IP}, saved as $TARGET (plain "target" works too). You: ${LHOST}, saved as $LHOST`, 'y');
    term.print(room.guided ? 'Easiest way: press Run on a task. Or type the command yourself.' : 'Tools: nmap curl wget nc ssh base64 tr hashcat john cat ls cd echo sudo exit', 'a');
    term.print('Keys: ↑/↓ history · Tab completes · Ctrl+L clears · man <tool> for a short manual', 'm');
  }

  // ---------------- strikes and the clock (Hard) ----------------
  function strike(why: string) {
    if (!room.strikes || locked || finished) return;
    strikes += 1;
    $('#strikes-n').textContent = `${strikes}/${room.strikes}`;
    terms.forEach((t) => t.print(`STRIKE ${strikes}/${room.strikes}: ${why}`, 'r'));
    page.classList.remove('shake'); void page.offsetWidth; page.classList.add('shake');
    persist();
    if (strikes >= room.strikes) return lockout('IDS triggered: five strikes.');
    say(room.strikes - strikes === 1 ? quip('strikeLast') : quip('strike', { n: strikes, left: room.strikes - strikes }), { state: 'scared', ms: 2800 });
  }
  function startClock() {
    const el = $('#clock-n');
    clearInterval(tick);
    tick = window.setInterval(() => {
      const left = room.limit - (Date.now() - clockStart) / 1000;
      el.textContent = fmt(left);
      el.parentElement!.classList.toggle('low', left < 30);
      if (left <= 0) lockout('Time is up. The IDS closed your session.');
    }, 250);
  }
  function lockout(msg: string) {
    locked = true;
    clearSession();
    clearInterval(upT);
    clearInterval(tick);
    terms.forEach((t) => t.print(msg + ' The room has been reset.', 'r'));
    say(quip('lockout'), { state: 'sad', stay: true, actions: [{ label: 'Restart', onClick: () => location.reload() }] });
    resetRoom(room.slug);
    save = getRoom(room.slug);
    paintQuestions();
    startM.textContent = 'Restart machine';
    startM.disabled = false;
    startM.onclick = () => location.reload();
    setStatus('Locked out', 'off');
  }

  // ---------------- idle Scout ----------------
  let idleT = 0;
  let dozing = false;
  function activity() {
    clearTimeout(idleT);
    if (dozing) { dozing = false; say(quip('wake'), { state: 'waking', ms: 2500 }); }
    idleT = window.setTimeout(() => { dozing = true; say(quip('idle'), { state: 'sleeping', ms: 6000 }); }, 60000);
  }

  // ---------------- guided buttons ----------------
  async function ensureUp() {
    if (machine === 'off') await startMachine(true);
    while (machine !== 'on') await new Promise((r) => setTimeout(r, 120));
    await bootBox(true);
    if (innerWidth < 900) setView('box');
  }
  $$<HTMLButtonElement>('[data-run]').forEach((b) => b.addEventListener('click', async () => {
    await ensureUp();
    const rec = orderedTabs().find((t) => t.kind === 'term') ?? newTerminal();
    showTab(rec.id);
    rec.term!.type(b.dataset.run!);
  }));
  $$<HTMLButtonElement>('[data-browse]').forEach((b) => b.addEventListener('click', async () => {
    await ensureUp();
    const rec = orderedTabs().find((t) => t.kind === 'brw') ?? addBrowser();
    showTab(rec.id);
    rec.browser!.go(b.dataset.browse!);
  }));

  // phones: switch between the task list and the box
  function setView(v: 'tasks' | 'box') {
    page.dataset.view = v;
    $$('[data-view-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.viewBtn === v)));
  }
  $$('[data-view-btn]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.viewBtn as 'tasks' | 'box')));

  // ---------------- completion ----------------
  function finishRoom() {
    if (finished) return;
    finished = true;
    clearInterval(tick);
    const secs = Math.round((Date.now() - (clockStart || startedAt || Date.now())) / 1000);
    save.done = true;
    const now = new Date();
    save.doneAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (!save.best || secs < save.best) save.best = secs;
    saveRoom(room.slug, save);
    const earned: BadgeId[] = ['first-blood'];
    if (['break-in', 'backup-blues', 'ghost-in-the-shell'].every((s) => s === room.slug || getRoom(s).done)) earned.push('all-three');
    if (room.slug === 'backup-blues' && save.hints === 0) earned.push('clean');
    if (room.slug === 'ghost-in-the-shell' && strikes === 0) earned.push('ghost');
    if (room.slug === 'ghost-in-the-shell' && secs < 120) earned.push('speed');
    const h = new Date().getHours();
    if (h < 5) earned.push('night');
    if (matchMedia('(pointer: coarse)').matches) earned.push('pocket');
    const fresh = earned.filter((b) => award(b)).map((b) => BADGES.find((x) => x.id === b)!.name);
    showDone(secs, fresh);
    confetti();
    say(fresh.length ? quip('completeBadges', { badges: fresh.join(', ') }) : quip('complete'), { state: 'celebrate', gesture: 'spin', ms: 6000 });
  }

  function showDone(secs: number | undefined, fresh: string[] = []) {
    const done = $('#done');
    done.hidden = false;
    $('#done-time').textContent = secs !== undefined ? fmt(secs) : save.best ? fmt(save.best) : '—';
    $('#done-hints').textContent = String(save.hints);
    if (fresh.length) $('#done-badges').textContent = 'New: ' + fresh.join(', ');
    import('./cert-ui').then((m) => m.initCertificate(room, { secs: secs ?? save.best ?? 0, hints: save.hints, strikes: room.strikes ? strikes : undefined, say }));
    if (secs !== undefined) done.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  function confetti() {
    if (reduced) return;
    const layer = document.createElement('div');
    layer.className = 'confetti';
    document.body.appendChild(layer);
    const colors = ['#9e1b2c', '#16181d', '#a8642a', '#2f6b4f', '#d6d0c2'];
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('i');
      p.style.background = pick(colors);
      p.style.left = utils.random(0, 100) + 'vw';
      layer.appendChild(p);
    }
    animate(layer.children, {
      y: () => [utils.random(-80, -20), innerHeight + 60], x: () => utils.random(-120, 120), rotate: () => utils.random(-540, 540),
      duration: () => utils.random(1800, 3200), delay: stagger(15), ease: 'outQuad',
      onComplete: () => layer.remove(),
    });
  }

  // ---------------- start ----------------
  const back = finished ? null : readSession();
  if (back) {
    tokens.clear(); back.tokens.forEach((t) => tokens.add(t));
    back.files.forEach(([k, v]) => files.set(k, v));
    env = { ...env, ...back.env, TARGET: IP, LHOST };
    termSeq = back.seq;
    if (back.machine === 'on') { startedAt = back.startedAt || Date.now(); showUp(); }
    if (room.strikes) { strikes = back.strikes; $('#strikes-n').textContent = `${strikes}/${room.strikes}`; }
    if (back.boxUp) {
      boxUp = true;
      $('#box-start').hidden = true;
      desk.hidden = false;
      back.tabs.forEach((t) => (t.kind === 'term' ? newTerminal(t) : addBrowser(t)));
      const order = orderedTabs();
      showTab((order[back.active] ?? order[0]).id);
      if (innerWidth < 900) setView('box');
    }
    if (room.limit && back.clockStart) { clockStart = back.clockStart; startClock(); }
    setTimeout(() => say('Refreshed? Relax, I kept your session warm. Everything is where you left it.', { state: 'happy', ms: 4200 }), 900);
  }
  paintQuestions();
  {
    const first = tasksEls.find((t) => !t.classList.contains('done'));
    tasksEls.forEach((t) => setOpen(detailsOf(t), t === first, false));
  }
  accordionReady = true;
  $('#hints-n').textContent = String(save.hints);
  if (finished) showDone(undefined);
  if (new Date().getHours() < 5) setTimeout(() => say(quip('night', { time: clock() }), { state: 'drowsy', ms: 6000 }), 1500);
  activity();
}

const MAN: Record<string, string> = {
  nmap: 'nmap <host>          scan the 1000 most common ports\nnmap -p- <host>      scan all 65535 ports (slower, finds more)',
  curl: 'curl <url>                   fetch a page and print it\ncurl -u user:pass <url>      send a username and password\ncurl -H "Name: value" <url>  add a header\ncurl -O <url>                save the file',
  wget: 'wget <url>    download a file to the current folder',
  nc: 'nc <host> <port>    open a raw connection to a port',
  ssh: 'ssh user@host    log in to a remote machine (asks for the password)',
  base64: 'base64 -d <file>       decode a base64 file\necho <text> | base64 -d',
  tr: "tr 'A-Za-z' 'N-ZA-Mn-za-m'    rotate letters by 13 (ROT13)",
  hashcat: 'hashcat <hash>    try to crack a password hash with the bundled wordlist',
  john: 'john <hash>    same idea as hashcat',
  sudo: 'sudo -l              list what you may run as root\nsudo <command>       run a command as root',
};

const NEOFETCH = `                   -\`                 attacker@labbox
                  .o+\`                ---------------
                 \`ooo/                OS: Arch Linux x86_64
                \`+oooo:               Kernel: 6.11.3-arch1-1
               \`+oooooo:              Shell: zsh
               -+oooooo+:             WM: bspwm
             \`/:-:++oooo+:            Role: penetration tester
            \`/++++/+++++++:           Motto: btw
           \`/++++++++++++++:
          \`/+++ooooooooooooo/\``;
