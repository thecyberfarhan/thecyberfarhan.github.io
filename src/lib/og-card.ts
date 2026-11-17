// Build-time Open Graph card generator. Each writeup/project page gets its own
// 1200x630 card so link previews are distinct and READABLE at the small size
// LinkedIn shows for organic link posts. Writeups render as an attack chain: a
// kicker (name / platform / difficulty) and a vertical timeline of 3-4 big
// steps, foothold to root, the final node in the difficulty colour. Pages with
// no chain (projects, anything new) fall back to one big editorial line. No
// website URL or brand text: it reads at a glance, nothing small. Rendered with
// resvg from vendored Inter, supersampled 2x and flattened to JPEG (no alpha,
// which LinkedIn rejects). Automatic for every page.
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
  platform: string;    // "TryHackMe", "Hack The Box", "Open source · Fork"
  title: string;       // box / tool name, shown in the kicker
  tag: string;         // difficulty or language, shown in the kicker
  tagColor: string;    // kicker accent for the tag and the final chain node
  chain?: string[];    // attack-chain steps; when 2+ present, chain layout
  focus?: string;      // one editorial line, used when there is no chain
}

// The kicker: NAME · PLATFORM · TAG, the tag in the accent colour.
function kickerSvg(name: string, platform: string, tag: string, tagColor: string): string {
  const sep = `<tspan fill="#5a6472"> &#183; </tspan>`;
  return `<text x="110" y="112" font-family="Inter" font-weight="700" font-size="33" letter-spacing="3" fill="#9aa4b2">${esc(name.toUpperCase())}${sep}${esc(platform.toUpperCase())}${sep}<tspan fill="${tagColor}">${esc(tag.toUpperCase())}</tspan></text>`;
}

// Vertical attack-chain timeline. Font scales with step count, then shrinks
// further if any step would overflow the width, so every line stays on one row.
function chainSvg(steps: string[], accent: string): string {
  const n = steps.length;
  const byCount = n <= 3 ? 62 : n === 4 ? 54 : 48;
  const longest = Math.max(...steps.map((s) => s.length));
  const byWidth = Math.floor(1000 / (longest * 0.56));
  const fs = Math.max(34, Math.min(byCount, byWidth));
  const areaTop = 192, areaBottom = 558;
  const gap = (areaBottom - areaTop) / (n - 1);
  const xDot = 118, xText = 170;
  const ys = steps.map((_, i) => Math.round(areaTop + i * gap));
  const line = `<rect x="${xDot - 3}" y="${ys[0]}" width="6" height="${ys[n - 1] - ys[0]}" fill="#2b3340"/>`;
  const nodes = steps
    .map((s, i) => {
      const last = i === n - 1;
      const col = last ? accent : '#6b7482';
      const dot = `<circle cx="${xDot}" cy="${ys[i]}" r="${last ? 13 : 10}" fill="${col}"/>`;
      const txt = `<text x="${xText}" y="${ys[i] + fs * 0.34}" font-family="Inter" font-weight="700" font-size="${fs}" fill="${last ? '#ffffff' : '#eef2f7'}">${esc(s)}</text>`;
      return dot + txt;
    })
    .join('');
  return line + nodes;
}

// One big editorial line, left-aligned and vertically centred, with a short
// accent rule above it. Used for projects and any page without a chain.
function editorialSvg(focus: string, accent: string): string {
  focus = deDash(focus);
  const ff = 76;
  const lines = wrap(focus, Math.floor(990 / (ff * 0.55)), 3);
  const lh = ff * 1.14;
  const mid = (192 + 558) / 2;
  const top = Math.round(mid - ((lines.length - 1) * lh) / 2 + ff * 0.32);
  const rule = `<rect x="112" y="${Math.round(top - ff * 0.92 - 34)}" width="72" height="8" rx="4" fill="${accent}"/>`;
  const body = lines
    .map((l, i) => `<text x="110" y="${top + i * lh}" font-family="Inter" font-weight="700" font-size="${ff}" fill="#eef2f7">${esc(l)}</text>`)
    .join('');
  return rule + body;
}

export async function ogCardImage({ platform, title, tag, tagColor, chain, focus }: OgCardInput): Promise<Buffer> {
  const name = deDash(title);
  const steps = (chain ?? []).filter((s) => s && s.trim());
  const body = steps.length >= 2 ? chainSvg(steps, tagColor) : editorialSvg(focus || name, tagColor);

  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#141b29"/><stop offset="55%" stop-color="#0f1420"/><stop offset="100%" stop-color="#0a0e16"/></linearGradient>
    <radialGradient id="warm" cx="28%" cy="16%" r="82%"><stop offset="0%" stop-color="#e5534b" stop-opacity="0.16"/><stop offset="100%" stop-color="#e5534b" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#warm)"/>
  ${kickerSvg(name, platform, tag, tagColor)}
  ${body}
</svg>`;

  // Supersample: render at 2x, downscale with lanczos3 for crisp edges, then
  // flatten to high-quality mozjpeg (no alpha).
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: 2400 },
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Inter' },
  })
    .render()
    .asPng();
  return sharp(png)
    .resize(1200, 630, { kernel: 'lanczos3' })
    .flatten({ background: '#0d1117' })
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toBuffer();
}
