// The browser window inside the lab box. It only ever "loads" the room's fake target site;
// every page is built from data with createElement/textContent.
import type { Page, Block } from '../../data/rooms';

type Opts = {
  site: (url: URL) => Page;
  onLoad: (page: Page) => void;
  onLogin?: (user: string, pass: string) => Page | null;
  // called after every navigation, so the room can retitle the tab and save the session
  onNav?: (title: string) => void;
};

export type BrwSnap = { hist: string[]; pos: number };

const HOSTS = ['target', '10.10.11.42'];

export class Browser {
  root: HTMLElement;
  private bar: HTMLInputElement;
  private view: HTMLElement;
  private srcBtn: HTMLButtonElement;
  private back: HTMLButtonElement;
  private fwd: HTMLButtonElement;
  private sec: HTMLElement;
  private code: HTMLElement;
  private status: HTMLElement;
  private hist: string[] = [];
  private pos = -1;
  private page: Page | null = null;
  private showSource = false;
  title = 'New tab';

  constructor(host: HTMLElement, private opts: Opts) {
    this.root = document.createElement('div');
    this.root.className = 'brw';
    this.root.innerHTML = `
      <div class="brw-bar">
        <button type="button" data-a="back" aria-label="Back" title="Back (Alt+←)">←</button>
        <button type="button" data-a="fwd" aria-label="Forward" title="Forward (Alt+→)">→</button>
        <button type="button" data-a="reload" aria-label="Reload" title="Reload">↻</button>
        <form class="brw-url">
          <span class="brw-sec" hidden title="This page is served over plain HTTP. Anyone on the network can read it, which is exactly why you can.">Not secure</span>
          <input aria-label="Address" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="Search or type an address" />
          <span class="brw-code" hidden></span>
        </form>
        <button type="button" data-a="src" class="src" aria-pressed="false" title="View page source (Ctrl+U)">&lt;/&gt;</button>
      </div>
      <div class="brw-load" aria-hidden="true"></div>
      <div class="brw-view" tabindex="0"></div>
      <div class="brw-status" aria-hidden="true"></div>`;
    host.appendChild(this.root);
    this.bar = this.root.querySelector('input')!;
    this.view = this.root.querySelector('.brw-view')!;
    this.srcBtn = this.root.querySelector('.src')!;
    this.back = this.root.querySelector('[data-a=back]')!;
    this.fwd = this.root.querySelector('[data-a=fwd]')!;
    this.sec = this.root.querySelector('.brw-sec')!;
    this.code = this.root.querySelector('.brw-code')!;
    this.status = this.root.querySelector('.brw-status')!;
    this.root.querySelector('form')!.addEventListener('submit', (e) => { e.preventDefault(); this.go(this.bar.value); });
    this.bar.addEventListener('focus', () => this.bar.select());
    this.root.querySelector('.brw-bar')!.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest('button')?.dataset.a;
      if (a === 'back') this.step(-1);
      if (a === 'fwd') this.step(1);
      if (a === 'reload' && this.pos >= 0) this.load(this.hist[this.pos]);
      if (a === 'src') this.toggleSource();
    });
    this.root.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') { e.preventDefault(); this.toggleSource(); }
      else if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); this.step(-1); }
      else if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); this.step(1); }
    });
    this.blank();
    this.paintNav();
  }

  snapshot(): BrwSnap { return { hist: this.hist.slice(-30), pos: Math.min(this.pos, 29) }; }
  // reopen the page that was showing, without re-running its side effects (tokens, strikes)
  restore(s: BrwSnap) {
    this.hist = s.hist.slice();
    this.pos = Math.max(-1, Math.min(s.pos, this.hist.length - 1));
    if (this.pos >= 0) this.load(this.hist[this.pos], true);
    else this.paintNav();
  }

  private step(d: number) {
    const to = this.pos + d;
    if (to < 0 || to >= this.hist.length) return;
    this.pos = to;
    this.load(this.hist[to]);
  }
  private toggleSource() {
    if (!this.page) return;
    this.showSource = !this.showSource;
    this.srcBtn.setAttribute('aria-pressed', String(this.showSource));
    this.render();
  }
  private paintNav() {
    this.back.disabled = this.pos <= 0;
    this.fwd.disabled = this.pos >= this.hist.length - 1;
  }

  private blank() {
    this.page = null;
    this.title = 'New tab';
    this.view.textContent = '';
    this.sec.hidden = true;
    this.code.hidden = true;
    const p = document.createElement('div');
    p.className = 'brw-home';
    const logo = document.createElement('p');
    logo.className = 'brw-logo';
    logo.textContent = 'New tab';
    const tip = document.createElement('p');
    tip.textContent = 'This browser is on the target network only. No internet, no distractions.';
    const tiles = document.createElement('div');
    tiles.className = 'brw-tiles';
    [['target', 'http://target/', 'The target, port 80'], ['10.10.11.42', 'http://10.10.11.42/', 'Same box, by IP']].forEach(([name, href, sub]) => {
      const a = document.createElement('a');
      a.href = '#';
      a.className = 'brw-tile';
      const b = document.createElement('b');
      b.textContent = name;
      const s = document.createElement('span');
      s.textContent = sub;
      a.append(b, s);
      a.addEventListener('click', (e) => { e.preventDefault(); this.go(href); });
      tiles.appendChild(a);
    });
    p.append(logo, tip, tiles);
    this.view.appendChild(p);
  }

  go(raw: string) {
    let s = raw.trim();
    if (!s) return;
    if (!/^https?:\/\//i.test(s)) s = 'http://' + s;
    this.hist = this.hist.slice(0, this.pos + 1);
    this.hist.push(s);
    this.pos = this.hist.length - 1;
    this.load(s);
  }

  private load(href: string, silent = false) {
    let url: URL | null = null;
    try { url = new URL(href); } catch { url = null; }
    this.bar.value = href;
    this.showSource = false;
    this.srcBtn.setAttribute('aria-pressed', 'false');
    const onTarget = !!url && HOSTS.includes(url.hostname);
    if (!url || !onTarget) {
      this.page = { title: 'Offline', status: 0, blocks: [['h1', 'Hmm. We can\'t reach that site.'], ['p', 'The lab box has no internet access, only the target network. Try http://target/']], source: '' };
    } else {
      this.page = this.opts.site(url);
      if (!silent) this.opts.onLoad(this.page);
    }
    this.title = this.page.title || href;
    this.sec.hidden = !onTarget || url!.protocol !== 'http:';
    const st = onTarget ? this.page.status ?? 200 : 0;
    this.code.hidden = !st;
    this.code.textContent = String(st);
    this.code.className = 'brw-code' + (st >= 400 ? ' bad' : '');
    this.paintNav();
    // a loading bar sweeps across while the "request" is in flight
    this.root.classList.remove('loading'); void this.root.offsetWidth; this.root.classList.add('loading');
    this.view.classList.add('loading');
    setTimeout(() => { this.view.classList.remove('loading'); this.root.classList.remove('loading'); this.render(); }, silent ? 0 : 260);
    this.opts.onNav?.(this.title);
  }

  private render() {
    const p = this.page;
    this.view.textContent = '';
    if (!p) return this.blank();
    if (this.showSource) {
      const pre = document.createElement('pre');
      pre.className = 'brw-src';
      pre.textContent = p.source || '(empty response)';
      this.view.appendChild(pre);
      return;
    }
    const doc = document.createElement('div');
    doc.className = 'brw-doc' + (p.status && p.status >= 400 ? ' err' : '');
    p.blocks.forEach((b: Block) => doc.appendChild(this.block(b)));
    this.view.appendChild(doc);
  }

  private block(b: Block): HTMLElement {
    if (b[0] === 'links') {
      const ul = document.createElement('ul');
      b[1].forEach(([label, href]) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#';
        a.textContent = label;
        a.addEventListener('click', (e) => { e.preventDefault(); this.go(href); });
        // like a real browser, hovering a link shows where it goes in the corner
        a.addEventListener('mouseenter', () => { this.status.textContent = new URL(href, this.hist[this.pos] ?? 'http://target/').href; this.status.classList.add('on'); });
        a.addEventListener('mouseleave', () => this.status.classList.remove('on'));
        li.appendChild(a);
        ul.appendChild(li);
      });
      return ul;
    }
    if (b[0] === 'login') {
      const f = document.createElement('form');
      f.className = 'brw-login';
      f.innerHTML = '<label>Username<input name="u" autocomplete="off" autocapitalize="off" /></label><label>Password<input name="p" type="password" autocomplete="off" /></label><button type="submit">Log in</button><p class="brw-msg" role="alert"></p>';
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const u = (f.elements.namedItem('u') as HTMLInputElement).value.trim();
        const pw = (f.elements.namedItem('p') as HTMLInputElement).value;
        const ok = this.opts.onLogin?.(u, pw);
        if (ok) { this.page = ok; this.title = ok.title; this.opts.onLoad(ok); this.opts.onNav?.(ok.title); this.render(); }
        else f.querySelector('.brw-msg')!.textContent = 'Invalid username or password.';
      });
      return f;
    }
    // the fake site's headline is styled like one, but is not a real h1 of this page
    const el = document.createElement(b[0] === 'h1' ? 'p' : b[0]);
    if (b[0] === 'h1') el.className = 'brw-h1';
    el.textContent = b[1];
    return el;
  }
}
