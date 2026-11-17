// Build-time Open Graph card generator. Each writeup/project page gets its own
// 1200x630 card so link previews are distinct and, crucially, READABLE at the
// small size LinkedIn shows for organic link posts. The card is a centered
// mini-poster: a platform/difficulty kicker, the name, and a one-line focus
// (what you'll learn). Rendered with resvg from vendored Inter, flattened to
// JPEG (no alpha — LinkedIn rejects RGBA PNGs). Automatic for every page.
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { join } from 'node:path';

const FONT_FILES = [
  join(process.cwd(), 'src/assets/og-fonts/Inter-Regular.ttf'),
  join(process.cwd(), 'src/assets/og-fonts/Inter-Bold.ttf'),
];

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const deDash = (s: string) => String(s).replace(/\s*—\s*/g, ', ').replace(/\s+,/g, ',');

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
      let last = ''; let j = 0;
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
  platform: string;    // "TryHackMe" or "Open source · Fork"
  title: string;       // box / tool name
  tag: string;         // difficulty or language, shown in the kicker
  tagColor: string;    // kicker accent for the tag
  focus: string;       // one line: what you'll learn (may be empty)
}

export async function ogCardImage({ platform, title, tag, tagColor, focus }: OgCardInput): Promise<Buffer> {
  title = deDash(title);
  focus = deDash(focus);

  let tfs = 128;
  if (title.length > 8) tfs = 104;
  if (title.length > 14) tfs = 84;
  if (title.length > 22) tfs = 64;
  if (title.length > 32) tfs = 52;
  const tl = wrap(title, Math.floor(1040 / (tfs * 0.56)), 2);
  const tLH = tfs * 1.04;
  const hasFocus = Boolean(focus && focus.trim());
  // nudge the title block up a little when a focus line follows, else center it
  const tTop = (hasFocus ? 258 : 330) - ((tl.length - 1) * tLH) / 2;
  const titleSvg = tl
    .map((l, i) => `<text x="600" y="${Math.round(tTop + i * tLH)}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="${tfs}" fill="#f4f7fb">${esc(l)}</text>`)
    .join('');

  let focusSvg = '';
  if (hasFocus) {
    const ff = 44;
    const fTop = Math.round(tTop + (tl.length - 1) * tLH + 92);
    const fLH = ff * 1.12;
    focusSvg = wrap(focus, Math.floor(1000 / (ff * 0.54)), 2)
      .map((l, i) => `<text x="600" y="${fTop + i * fLH}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="${ff}" fill="#cdd6e0">${esc(l)}</text>`)
      .join('');
  }

  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#141b29"/><stop offset="55%" stop-color="#0f1420"/><stop offset="100%" stop-color="#0a0e16"/></linearGradient>
    <radialGradient id="warm" cx="50%" cy="22%" r="72%"><stop offset="0%" stop-color="#e5534b" stop-opacity="0.15"/><stop offset="100%" stop-color="#e5534b" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#warm)"/>
  <text x="600" y="120" text-anchor="middle" font-family="Inter" font-weight="700" font-size="30" letter-spacing="5" fill="#8b94a3">${esc(platform.toUpperCase())}<tspan fill="#5a6472">   /   </tspan><tspan fill="${tagColor}">${esc(tag.toUpperCase())}</tspan></text>
  ${titleSvg}
  ${focusSvg}
  <text x="600" y="586" text-anchor="middle" font-family="Inter" font-weight="400" font-size="24" fill="#5f6b7a">thecyberfarhan.github.io</text>
</svg>`;

  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Inter' },
  })
    .render()
    .asPng();
  return sharp(png).flatten({ background: '#0d1117' }).jpeg({ quality: 88, chromaSubsampling: '4:4:4' }).toBuffer();
}
