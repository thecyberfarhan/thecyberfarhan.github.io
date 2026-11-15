// Site-wide Easter eggs. Cheap to load: Scout itself is only imported when an egg fires.

// for anyone who opens the developer console
console.log(
  '%cHey, you opened the console.%c\nGood instinct. There is a flag hidden on this site, and real recon starts with the files nobody reads. Try /robots.txt.',
  'font: 600 16px Georgia, serif; color: #9e1b2c;',
  'font: 13px system-ui; color: #3b3f47;',
);
console.log('%cP.S. This site had a previous life. Type "old" anywhere on the page (not in a box) and ask Scout about it.', 'font: 12px system-ui; color: #8d96a0;');

// ↑ ↑ ↓ ↓ ← → ← → B A
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let k = 0;
addEventListener('keydown', (e) => {
  const t = e.target;
  if (t instanceof Element && t.closest('input, textarea, [contenteditable]')) return;
  k = e.key.toLowerCase() === KONAMI[k].toLowerCase() ? k + 1 : e.key === KONAMI[0] ? 1 : 0;
  if (k < KONAMI.length) return;
  k = 0;
  Promise.all([import('./scout'), import('./lines')]).then(([{ say }, { line }]) => say(line('konami'), {
    state: 'excited', gesture: 'spin', ms: 7000,
    actions: [{ label: 'Take me there', onClick: () => { location.href = '/lab/'; } }],
  }));
});

// type "old" (or "retro") anywhere outside a text box and Scout spills where the previous design lives
let typed = '';
addEventListener('keydown', (e) => {
  const t = e.target;
  if (t instanceof Element && t.closest('input, textarea, [contenteditable]')) return;
  if (e.key.length !== 1) return;
  typed = (typed + e.key.toLowerCase()).slice(-6);
  if (!/(old|retro)$/.test(typed)) return;
  typed = '';
  oldSecret();
});

export function oldSecret() {
  const lines = [
    'Nostalgic? The old version of this site still lives at /old. Same guy, more matrix rain.',
    'You found the time machine. The previous design is parked at /old. Do not tell the new one I told you.',
    'Every site has a past. This one kept it at /old, with the three.js and everything.',
  ];
  import('./scout').then(({ say }) => say(lines[Math.floor(Math.random() * lines.length)], {
    state: 'suspicious', gesture: 'nod', ms: 8000, priority: true,
    actions: [{ label: 'Take me there', onClick: () => { location.href = '/old/'; } }],
  }));
}
