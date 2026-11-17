// Build-time Open Graph card generator. Each writeup/project page gets its own
// 1200x630 PNG so link previews look distinct and professional instead of all
// sharing one banner. Rendered from vendored assets through resvg, so the build
// never fetches anything at runtime. New pages get a card automatically.
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Resolve from the project root (build cwd) so paths survive Vite bundling of
// this module into a chunk, both locally and on CI. resvg-js loads fonts by path.
const ASSETS = join(process.cwd(), 'src/assets');
const FONT_FILES = [join(ASSETS, 'og-fonts/Inter-Regular.ttf'), join(ASSETS, 'og-fonts/Inter-Bold.ttf')];
const AVATAR = 'data:image/png;base64,' + readFileSync(join(ASSETS, 'og-avatar.png')).toString('base64');

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// house rule: no em dashes — turn them into a comma pause
const deDash = (s: string) => String(s).replace(/\s*—\s*/g, ', ').replace(/\s+,/g, ',');

// greedy word-wrap into at most maxLines; the final line is filled and gets an
// ellipsis only when text is left over.
function wrap(text: string, max: number, maxLines: number): string[] {
  const words = String(text).trim().split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (let k = 0; k < words.length; k++) {
    const w = words[k];
    const t = cur ? cur + ' ' + w : w;
    if (t.length <= max) { cur = t; continue; }
    lines.push(cur);
    if (lines.length === maxLines - 1) {
      const rest = words.slice(k);
      let last = '';
      let j = 0;
      for (; j < rest.length; j++) { const tt = last ? last + ' ' + rest[j] : rest[j]; if (tt.length <= max) last = tt; else break; }
      if (j < rest.length) last = last.replace(/[,.;:\s]+$/, '') + '…';
      lines.push(last);
      return lines;
    }
    cur = w;
  }
  if (cur) lines.push(cur);
  return lines;
}

export interface OgCardInput {
  kicker: string;   // e.g. "TRYHACKME  ·  WRITEUP"
  title: string;    // box / tool name
  summary: string;  // the page's own takeaway / tagline
  badge: string;    // difficulty or language
  badgeColor: string;
}

export function ogCardPng({ kicker, title, summary, badge, badgeColor }: OgCardInput): Buffer {
  title = deDash(title);
  summary = deDash(summary);

  let tfs = 104;
  if (title.length > 12) tfs = 84;
  if (title.length > 20) tfs = 66;
  if (title.length > 30) tfs = 54;
  const tlines = wrap(title, Math.floor(980 / (tfs * 0.56)), 2);
  const tLH = tfs * 1.06;
  const titleTop = 250 - ((tlines.length - 1) * tLH) / 2;
  const titleSvg = tlines
    .map((l, i) => `<text x="80" y="${Math.round(titleTop + i * tLH)}" font-family="Inter" font-weight="700" font-size="${tfs}" fill="#f3f6fa">${esc(l)}</text>`)
    .join('');

  const sumTop = Math.round(titleTop + (tlines.length - 1) * tLH + 66);
  const sumSvg = wrap(summary, 62, 3)
    .map((l, i) => `<text x="80" y="${sumTop + i * 46}" font-family="Inter" font-weight="400" font-size="32" fill="#9aa6b5">${esc(l)}</text>`)
    .join('');

  const badgeText = badge.trim();
  const bw = Math.round(badgeText.length * 15 + 46);
  const bx = 1200 - 80 - bw;

  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#141b29"/><stop offset="55%" stop-color="#0f1420"/><stop offset="100%" stop-color="#0a0e16"/>
    </linearGradient>
    <radialGradient id="warm" cx="88%" cy="8%" r="55%">
      <stop offset="0%" stop-color="#e5534b" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#e5534b" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="avclip"><circle cx="112" cy="556" r="34"/></clipPath>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#warm)"/>

  <rect x="80" y="86" width="26" height="26" rx="5" fill="#e5534b"/>
  <text x="120" y="107" font-family="Inter" font-weight="700" font-size="24" fill="#c2ccd8" letter-spacing="3">${esc(kicker)}</text>

  ${badgeText ? `<rect x="${bx}" y="80" width="${bw}" height="40" rx="20" fill="${badgeColor}"/>
  <text x="${bx + bw / 2}" y="107" font-family="Inter" font-weight="700" font-size="22" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">${esc(badgeText)}</text>` : ''}

  ${titleSvg}
  ${sumSvg}

  <circle cx="112" cy="556" r="36" fill="none" stroke="#e5534b" stroke-width="2"/>
  <image href="${AVATAR}" x="78" y="522" width="68" height="68" clip-path="url(#avclip)"/>
  <text x="166" y="548" font-family="Inter" font-weight="700" font-size="28" fill="#eaeef3">Farhan Hussain</text>
  <text x="166" y="578" font-family="Inter" font-weight="400" font-size="22" fill="#7e8a99">Penetration Tester  ·  thecyberfarhan.github.io</text>
</svg>`;

  return new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Inter' },
  })
    .render()
    .asPng();
}
