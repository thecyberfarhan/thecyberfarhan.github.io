// Site-wide Easter eggs. Cheap to load: Scout itself is only imported when an egg fires.

// for anyone who opens the developer console
console.log(
  '%cHey, you opened the console.%c\nGood instinct. There is a flag hidden on this site, and real recon starts with the files nobody reads. Try /robots.txt.',
  'font: 600 16px Georgia, serif; color: #9e1b2c;',
  'font: 13px system-ui; color: #3b3f47;',
);

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
