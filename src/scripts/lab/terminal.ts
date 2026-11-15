// A fake terminal: history, tab completion, password prompts. Output is always set with
// textContent, so nothing typed or printed can become markup.
type Opts = {
  onCommand: (line: string, term: Terminal) => void;
  complete: (word: string, isFirst: boolean, term: Terminal) => string[];
};
// what survives a page refresh: the visible output, the prompt and the command history
export type TermSnap = { lines: [string, string][]; cwd: string; user: string; hist: string[] };

export class Terminal {
  root: HTMLElement;
  out: HTMLElement;
  input: HTMLInputElement;
  ps: HTMLElement;
  user = 'attacker@labbox';
  cwd = '~';
  secret = false;
  private hist: string[] = [];
  private hi = 0;

  constructor(host: HTMLElement, private opts: Opts) {
    this.root = document.createElement('div');
    this.root.className = 'term';
    this.out = document.createElement('div');
    this.out.className = 't-out';
    this.out.setAttribute('role', 'log');
    this.out.setAttribute('aria-live', 'polite');
    const form = document.createElement('form');
    form.className = 't-in';
    this.ps = document.createElement('label');
    this.ps.className = 't-ps';
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.setAttribute('autocomplete', 'off');
    this.input.setAttribute('autocapitalize', 'off');
    this.input.setAttribute('autocorrect', 'off');
    this.input.spellcheck = false;
    this.input.maxLength = 300;
    this.input.setAttribute('aria-label', 'Terminal command');
    this.input.id = 'term-' + Math.random().toString(36).slice(2, 8);
    this.ps.htmlFor = this.input.id;
    form.append(this.ps, this.input);
    this.root.append(this.out, form);
    host.appendChild(this.root);
    this.renderPrompt();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const line = this.input.value;
      this.input.value = '';
      if (!this.secret) this.echo(line);
      else this.print(this.prompt() + '********', 'c');
      if (line.trim() && !this.secret) { this.hist.push(line); this.hi = this.hist.length; }
      this.opts.onCommand(line, this);
    });
    this.input.addEventListener('keydown', (e) => this.keys(e));
    this.root.addEventListener('mouseup', () => { if (!getSelection()?.toString()) this.input.focus({ preventScroll: true }); });
  }

  prompt() { return this.secret ? 'password: ' : `${this.user}:${this.cwd}${this.user.startsWith('root') ? '#' : '$'} `; }
  renderPrompt() { this.ps.textContent = this.prompt(); this.input.type = this.secret ? 'password' : 'text'; }
  setUser(user: string) { this.user = user; this.renderPrompt(); }
  setSecret(on: boolean) { this.secret = on; this.renderPrompt(); }

  echo(line: string) { this.print(this.prompt() + line, 'c'); }
  print(text: string, cls = '') {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    d.textContent = text;
    this.out.appendChild(d);
    while (this.out.childElementCount > 500) this.out.firstChild!.remove();
    this.out.scrollTop = this.out.scrollHeight;
    return d;
  }
  clear() { this.out.textContent = ''; }

  snapshot(): TermSnap {
    const lines = [...this.out.children].slice(-200).map((d) => [d.className, d.textContent ?? ''] as [string, string]);
    return { lines, cwd: this.cwd, user: this.user, hist: this.hist.slice(-100) };
  }
  restore(s: TermSnap) {
    this.clear();
    s.lines.forEach(([cls, text]) => this.print(text, cls));
    this.cwd = s.cwd;
    this.hist = s.hist.slice();
    this.hi = this.hist.length;
    this.setUser(s.user);
  }
  focus() { this.input.focus({ preventScroll: true }); }

  // type a command visibly, then run it: used by the guided Run buttons
  async type(cmd: string) {
    this.input.value = '';
    for (const ch of cmd) { this.input.value += ch; await new Promise((r) => setTimeout(r, 18)); }
    this.input.form!.requestSubmit();
  }

  private keys(e: KeyboardEvent) {
    if (e.key === 'ArrowUp' && this.hist.length) { e.preventDefault(); this.hi = Math.max(0, this.hi - 1); this.input.value = this.hist[this.hi]; }
    else if (e.key === 'ArrowDown' && this.hist.length) { e.preventDefault(); this.hi = Math.min(this.hist.length, this.hi + 1); this.input.value = this.hist[this.hi] ?? ''; }
    else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); this.clear(); }
    else if (e.key === 'c' && e.ctrlKey && !getSelection()?.toString()) {
      e.preventDefault();
      this.print(this.prompt() + this.input.value + '^C', 'c');
      this.input.value = '';
      if (this.secret) { this.setSecret(false); this.opts.onCommand('\u0003', this); }
    } else if (e.key === 'Tab' && !this.secret) {
      e.preventDefault();
      const v = this.input.value;
      const parts = v.split(' ');
      const word = parts[parts.length - 1];
      const hits = this.opts.complete(word, parts.length === 1, this).filter((c) => c.startsWith(word));
      if (hits.length === 1) { parts[parts.length - 1] = hits[0] + (hits[0].endsWith('/') ? '' : ' '); this.input.value = parts.join(' '); }
      else if (hits.length > 1) {
        let common = hits[0];
        hits.forEach((h) => { while (!h.startsWith(common)) common = common.slice(0, -1); });
        if (common.length > word.length) { parts[parts.length - 1] = common; this.input.value = parts.join(' '); }
        else { this.echo(v); this.print(hits.join('   '), 'm'); }
      }
    }
  }
}
