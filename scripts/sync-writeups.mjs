#!/usr/bin/env node
/* Pulls every writeup from thecyberfarhan/CTF-Writeups (TryHackme/ + HackTheBox/),
 * parses the shared template they're all written in, and regenerates writeups/*.html.
 *
 * - The *total* count (all difficulties, both folders) drives the "N writeups" stat
 *   on the main site and in llms.txt -- that's a raw fact, not curated.
 * - The *on-site pages* are curated down to Medium/Hard (and anything explicitly
 *   not Easy/Very Easy) -- Easy and Very Easy writeups stay on GitHub only.
 * - Pages for writeups that no longer exist upstream (renamed or deleted) are
 *   removed on the next run; nothing here is append-only.
 *
 * Run: node scripts/sync-writeups.mjs
 * (GITHUB_TOKEN env var is optional locally, used automatically in CI for the
 * higher authenticated rate limit.)
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, '..');
const OWNER = 'thecyberfarhan', REPO = 'CTF-Writeups';
const FOLDERS = [
  { dir: 'TryHackme', platform: 'TryHackMe' },
  { dir: 'HackTheBox', platform: 'Hack The Box' }
];
const EXCLUDE_DIFFICULTY = ['easy', 'very easy'];
const SITE_URL = 'https://thecyberfarhan.github.io';

const gh = (url) => fetch(url, {
  headers: {
    'Accept': 'application/vnd.github.v3+json',
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {})
  }
});

async function listFiles(dir) {
  const res = await gh(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${dir}`);
  if (!res.ok) throw new Error(`listing ${dir} failed: ${res.status}`);
  const data = await res.json();
  return data.filter((f) => f.type === 'file' && f.name.endsWith('.md'));
}

async function rawFile(dir, name) {
  const res = await fetch(`https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${dir}/${name}`);
  if (!res.ok) throw new Error(`fetching ${dir}/${name} failed: ${res.status}`);
  return res.text();
}

// ---------- parsing ----------

function cleanHeading(raw) {
  return raw
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}️]/gu, '')
    .replace(/\[.*?\]\(.*?\)/g, '')
    .trim();
}
function normKey(raw) {
  return cleanHeading(raw).toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function splitSections(md) {
  const lines = md.split('\n');
  const sections = {};
  let cur = null, buf = [];
  const flush = () => { if (cur) sections[cur] = buf.join('\n').trim(); };
  for (const line of lines) {
    const m = /^##\s+(.+)$/.exec(line);
    if (m && !/^###/.test(line)) {
      flush();
      cur = normKey(m[1]);
      buf = [];
    } else if (cur) {
      buf.push(line);
    }
  }
  flush();
  return sections;
}

function parseWriteup(md, platform) {
  const head = md.slice(0, 2000);
  // Restricted to the very first line only -- an unrestricted /m scan for "^# "
  // anywhere in the document will happily match a root-shell-prompt line like
  // "# whoami" quoted inside a later code block and mistake it for the title.
  const titleMatch = /^#\s+([^\n]+)/.exec(md.slice(0, 120));
  // the H1 shows up as either "THM — Name" or, on some newer writeups, the
  // reversed "Name — TryHackMe Writeup" -- strip whichever side carries the platform
  let rawTitle = titleMatch
    ? titleMatch[1]
      .replace(/^(THM|HTB)\s*[—-]\s*/i, '')
      .replace(/\s*[—-]\s*(TryHackMe|Hack\s*The\s*Box)\s*(Writeup)?\s*$/i, '')
      .trim()
    : null;

  const bannerMatch = /```\s*\n([\s\S]*?)```/.exec(md);
  let bannerTail = null;
  if (bannerMatch) {
    const bannerLines = bannerMatch[1].split('\n').map((l) => l.trim()).filter(Boolean);
    bannerTail = bannerLines[bannerLines.length - 1] || null;
  }
  if (!rawTitle && bannerTail) {
    rawTitle = bannerTail.replace(/^(TryHackMe|HackTheBox|Hack The Box)\s*[—-]\s*/i, '').trim();
  }

  let difficulty = null;
  const diffMatch = /\*\*Difficulty:\*\*\s*([^|\n]+)/i.exec(head);
  if (diffMatch) difficulty = diffMatch[1].trim().replace(/\s*\(.*?\)\s*$/, '');
  else if (bannerTail) {
    const known = ['very easy', 'easy', 'medium', 'hard', 'insane'];
    const tail = bannerTail.toLowerCase();
    const hit = known.find((k) => tail.includes(k));
    if (hit) difficulty = hit.replace(/\b\w/g, (c) => c.toUpperCase());
    else if (/custom|challenge/i.test(bannerTail)) difficulty = 'Challenge';
    // HTB's "Starting Point" track is explicitly the beginner-onboarding tier --
    // these writeups don't separately self-report a difficulty word, but the
    // track name itself is the signal, so treat it the same as "Very Easy".
    else if (/starting point/i.test(bannerTail)) difficulty = 'Very Easy';
  }

  let date = null;
  const dateMatch = /\*\*Date:\*\*\s*([\d-]{10})/.exec(head);
  if (dateMatch) date = dateMatch[1];
  else {
    const changelogMatch = /Last updated:\s*(\d{1,2}\s+\w+\s+\d{4})/i.exec(md);
    if (changelogMatch) {
      const d = new Date(changelogMatch[1]);
      if (!isNaN(d)) date = d.toISOString().slice(0, 10);
    }
  }

  const sections = splitSections(md);
  return { title: rawTitle || 'Untitled', difficulty, date, platform, sections };
}

// ---------- tiny markdown -> html ----------

function truncate(text, max) {
  const clean = text.replace(/\n+/g, ' ').replace(/[*`]/g, '').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')).trim() + '…';
}
function stripHr(text) {
  return text.split('\n').filter((l) => !/^(-{3,}|\*{3,}|_{3,})$/.test(l.trim())).join('\n');
}
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function mdToHtml(md) {
  if (!md) return '';
  const parts = [];
  let rest = md;
  const fenceRe = /```[a-z]*\n([\s\S]*?)```/g;
  let lastIndex = 0, m;
  const chunks = [];
  while ((m = fenceRe.exec(md))) {
    chunks.push({ type: 'text', body: md.slice(lastIndex, m.index) });
    chunks.push({ type: 'code', body: m[1].replace(/\n$/, '') });
    lastIndex = fenceRe.lastIndex;
  }
  chunks.push({ type: 'text', body: md.slice(lastIndex) });

  for (const chunk of chunks) {
    if (chunk.type === 'code') {
      parts.push(`<pre><code>${esc(chunk.body)}</code></pre>`);
      continue;
    }
    parts.push(textBlockToHtml(chunk.body));
  }
  return parts.join('\n');
}

function textBlockToHtml(text) {
  const lines = text.split('\n');
  const out = [];
  let i = 0;
  let para = [];
  const flushPara = () => {
    const t = para.join(' ').trim();
    if (t) out.push(`<p>${inline(t)}</p>`);
    para = [];
  };
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { flushPara(); i++; continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) { flushPara(); i++; continue; }
    if (/^###\s+/.test(line)) {
      flushPara();
      out.push(`<h3>${inline(cleanHeading(line.replace(/^###\s+/, '')))}</h3>`);
      i++; continue;
    }
    if (/^\|/.test(line.trim())) {
      flushPara();
      const tbl = [];
      while (i < lines.length && /^\|/.test(lines[i].trim())) { tbl.push(lines[i].trim()); i++; }
      out.push(tableToHtml(tbl));
      continue;
    }
    if (/^>\s?/.test(line)) {
      flushPara();
      const q = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, '')); i++; }
      out.push(`<blockquote>${inline(q.join(' ').replace(/^💡\s*\*\*Takeaway:\*\*\s*/, ''))}</blockquote>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushPara();
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^[-*]\s+/, '')); i++; }
      out.push(`<ul>${items.map((it) => `<li>${inline(it)}</li>`).join('')}</ul>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      flushPara();
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s+/, '')); i++; }
      out.push(`<ol>${items.map((it) => `<li>${inline(it)}</li>`).join('')}</ol>`);
      continue;
    }
    if (/^\*[^*]/.test(line.trim()) && line.trim().endsWith('*') && !line.includes('**')) {
      flushPara();
      out.push(`<p class="aside">${inline(line.trim().slice(1, -1))}</p>`);
      i++; continue;
    }
    para.push(line.trim());
    i++;
  }
  flushPara();
  return out.join('\n');
}

function tableToHtml(rows) {
  const cells = rows.map((r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  const [header, sep, ...body] = cells;
  if (!sep || !sep.every((c) => /^:?-+:?$/.test(c))) return '';
  const sevClass = (v) => /critical/i.test(v) ? ' class="sev-critical"' : /high/i.test(v) ? ' class="sev-high"' : /medium/i.test(v) ? ' class="sev-medium"' : '';
  const thead = `<tr>${header.map((h) => `<th>${inline(h)}</th>`).join('')}</tr>`;
  const tbody = body.map((r) => `<tr>${r.map((c) => `<td${sevClass(c)}>${inline(c)}</td>`).join('')}</tr>`).join('');
  return `<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
}

function toolChips(toolsSection) {
  if (!toolsSection) return '';
  const items = toolsSection.split('\n').filter((l) => /^[-*]\s+/.test(l)).map((l) => l.replace(/^[-*]\s+/, ''));
  const chips = items.map((it) => {
    const emoji = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u.exec(it);
    const rest = it.replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})️?\s*/u, '');
    const short = rest.split(/\s+[—-]\s+/)[0];
    return `<span class="chip">${emoji ? emoji[0] + ' ' : ''}${inline(short)}</span>`;
  });
  return `<div class="tools">${chips.join('')}</div>`;
}

// ---------- page render ----------

function plainTakeaway(w) {
  const raw = w.sections['key takeaway'] ? stripHr(w.sections['key takeaway']) : null;
  if (!raw) return null;
  return raw.split('\n').map((l) => l.replace(/^>\s?/, '')).join(' ').replace(/^💡\s*\*\*Takeaway:\*\*\s*/, '').replace(/[*`]/g, '').trim();
}

function difficultyClass(difficulty) {
  const key = (difficulty || '').toLowerCase();
  if (key === 'very easy') return 'l-veryeasy';
  if (key === 'easy') return 'l-easy';
  if (key === 'medium') return 'l-medium';
  if (key === 'hard') return 'l-hard';
  if (key === 'insane') return 'l-insane';
  if (key === 'challenge') return 'l-challenge';
  return 'l-written';
}

function ledgerHtml(items) {
  return items.map((w, i) => {
    const onSite = w.onSite;
    const href = onSite ? `writeups/${w.slug}.html` : `https://github.com/${OWNER}/${REPO}/blob/main/${w.dir}/${w.filename}`;
    const takeaway = plainTakeaway(w) || w.summary || `${w.platform} writeup.`;
    const blurb = esc(truncate(takeaway, 170));
    const diffLabel = w.difficulty || '';
    return `<li data-reveal style="--d:${i * 50}ms"><a class="lrow" href="${href}"${onSite ? '' : ' target="_blank" rel="noopener"'}><span class="l-plat">${esc(w.platform)}</span><span class="l-title">${esc(w.title)}</span><span class="l-take">${blurb}</span>${diffLabel ? `<span class="lvl ${difficultyClass(w.difficulty)}">${esc(diffLabel)}</span>` : ''}<span class="l-go"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"> <path d="M5 12h14" /> <path d="m12 5 7 7-7 7" /> </svg></span></a></li>`;
  }).join('\n');
}

// shared, inline, dependency-free: no eval, no innerHTML of anything user-controlled
const REVEAL_SCRIPT = `
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('[data-reveal]').forEach(function (el) { io.observe(el); });
} else {
  document.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('in'); });
}`;

const COPY_BUTTON_SCRIPT = `
document.querySelectorAll('pre').forEach(function (pre) {
  var btn = document.createElement('button');
  btn.className = 'copy-btn';
  btn.type = 'button';
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>Copy</span>';
  btn.addEventListener('click', function () {
    var code = pre.querySelector('code');
    var text = code ? code.textContent : pre.textContent;
    navigator.clipboard.writeText(text).then(function () {
      btn.classList.add('copied');
      btn.querySelector('span').textContent = 'Copied';
      setTimeout(function () { btn.classList.remove('copied'); btn.querySelector('span').textContent = 'Copy'; }, 1500);
    }).catch(function () {});
  });
  pre.appendChild(btn);
});`;

// difficulty actually means something now: each page tints its accent bar,
// TL;DR border and background rain to match -- same palette tokens as the
// main site (--lav/--steel/--red/--accent/--bronze), just mapped by tier
const DIFFICULTY_ORDER = ['very easy', 'easy', 'medium', 'hard', 'insane', 'challenge'];
const DIFFICULTY_COLOR = {
  'very easy': '#9C97B8',
  easy: '#7FA8CC',
  medium: '#C2686C',
  hard: '#B4232C',
  insane: '#FF5C5C',
  challenge: '#C79A66'
};
const DEFAULT_TINT = '#7FA8CC';
function tintFor(difficulty) { return DIFFICULTY_COLOR[(difficulty || '').toLowerCase()] || DEFAULT_TINT; }
function hexToRgb(hex) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [127, 168, 204];
}

// trimmed port of the main site's digital-rain canvas: same falling-glyph
// look, tinted to a single fixed color per page (no scroll-based section
// blending needed here -- these are single-purpose pages), no dot-field
// cursor glow or loader tie-in, since neither applies on a plain article page
function rainScript(tintHex) {
  const [r, g, b] = hexToRgb(tintHex);
  return `
(function () {
  var rc = document.getElementById('rain'), rctx = rc && rc.getContext && rc.getContext('2d');
  if (!rctx) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CHARS = '0123456789ABCDEF/\\\\#:_.>-'.split('');
  var GW = 0, GH = 0, cols = [], tint = [${r}, ${g}, ${b}], glyphSize = 14;
  function speed() { return (0.55 + Math.random() * 0.5); }
  function build() {
    var colW = innerWidth < 760 ? 20 : 24, n = Math.ceil(innerWidth / colW), density = innerWidth < 760 ? 0.38 : 0.5;
    cols = [];
    for (var i = 0; i < n; i++) {
      if (Math.random() > density) continue;
      var len = 5 + Math.floor(Math.random() * 7), glyphs = [];
      for (var k = 0; k < len; k++) glyphs.push(CHARS[Math.floor(Math.random() * CHARS.length)]);
      cols.push({ x: i * colW + colW / 2, y: -Math.random() * innerHeight, speed: speed(), len: len, glyphs: glyphs });
    }
  }
  function size() {
    var d = Math.min(window.devicePixelRatio || 1, innerWidth < 760 ? 1.1 : 1.5);
    GW = innerWidth; GH = innerHeight;
    rc.width = GW * d; rc.height = GH * d; rctx.setTransform(d, 0, 0, d, 0, 0);
    build();
  }
  function draw() {
    rctx.clearRect(0, 0, GW, GH);
    rctx.font = glyphSize + 'px var(--mono)';
    rctx.textBaseline = 'middle';
    cols.forEach(function (c) {
      for (var k = 0; k < c.len; k++) {
        var gy = c.y - k * glyphSize;
        if (gy < -glyphSize || gy > GH + glyphSize) continue;
        var fade = 1 - k / c.len, op = Math.pow(fade, 1.4) * 0.34;
        rctx.fillStyle = 'rgba(' + tint[0] + ',' + tint[1] + ',' + tint[2] + ',' + op.toFixed(3) + ')';
        rctx.fillText(c.glyphs[k], c.x, gy);
      }
      if (!reduced) { c.y += c.speed; if (c.y - c.len * glyphSize > GH) { c.y = -Math.random() * innerHeight * 0.3; c.speed = speed(); } }
    });
  }
  var running = false;
  function frame() { if (!running) return; try { draw(); } catch (e) {} if (!reduced) requestAnimationFrame(frame); }
  function start() { if (running || document.hidden) return; running = true; requestAnimationFrame(frame); }
  size(); draw(); if (!reduced) start();
  window.addEventListener('resize', function () { size(); draw(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) running = false; else start(); });
})();`;
}

function pageHtml(w, slug) {
  const dateHuman = w.date ? new Date(w.date + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  const tldr = stripHr(w.sections['tldr'] || w.sections['tl;dr'] || '') || null;
  const sectionOrder = [
    ['introduction', 'Introduction'],
    ['recon', 'Recon'],
    ['foothold', 'Foothold'],
    ['shell access', 'Shell / Access'],
    ['escalation', 'Escalation'],
    ['exploitation', 'The Full Chain'],
    ['rabbit holes', 'Rabbit Holes'],
    ['mitigations', 'Mitigations']
  ];
  const body = sectionOrder
    .filter(([key]) => w.sections[key])
    .map(([key, label]) => `<h2 data-reveal>${label}</h2>\n${mdToHtml(w.sections[key])}`)
    .join('\n');

  const takeawayRaw = w.sections['key takeaway'] ? stripHr(w.sections['key takeaway']) : null;
  const takeaway = takeawayRaw
    ? inline(takeawayRaw.split('\n').map((l) => l.replace(/^>\s?/, '')).join(' ').replace(/^💡\s*\*\*Takeaway:\*\*\s*/, '').trim())
    : '';
  const again = w.sections['if i did it again'] ? stripHr(w.sections['if i did it again']) : null;

  const desc = tldr ? truncate(tldr, 155) : `${w.platform} writeup: ${w.title}.`;
  const canonical = `${SITE_URL}/writeups/${slug}.html`;
  const tint = tintFor(w.difficulty);

  return `<!doctype html>
<html lang="en" data-theme="dark" style="--tint:${tint}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="view-transition" content="same-origin">
<title>${esc(w.title)} — ${esc(w.platform)} writeup | Farhan Hussain</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${esc(w.title)} — ${esc(w.platform)} writeup">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23161b22'/%3E%3Crect x='1' y='1' width='30' height='30' rx='6' fill='none' stroke='%23B4232C' stroke-width='2'/%3E%3Ctext x='16' y='22' font-family='Arial' font-size='18' font-weight='700' text-anchor='middle' fill='%23e6edf3'%3EF%3C/text%3E%3C/svg%3E">
<link rel="stylesheet" href="writeup.css">
<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: `${w.title} — ${w.platform} writeup`,
    description: desc,
    author: { '@id': `${SITE_URL}/#me` },
    datePublished: w.date || undefined,
    url: canonical,
    mainEntityOfPage: canonical
  })}</script>
</head>
<body>
<canvas id="rain" aria-hidden="true"></canvas>
<div class="wrap">
  <div class="topbar">
    <a class="back" href="./">&larr; All writeups</a>
    <a class="brand" href="${SITE_URL}/">Farhan<span>.</span></a>
  </div>
  <p class="eyebrow" data-reveal>${esc(w.platform)} writeup</p>
  <h1 data-reveal style="view-transition-name:wu-title-${slug}">${esc(w.title)}</h1>
  <div class="meta" data-reveal>
    <span class="plat">${esc(w.platform)}</span>
    ${w.difficulty ? `<span class="diff">${esc(w.difficulty)}</span>` : ''}
    ${dateHuman ? `<span>${esc(dateHuman)}</span>` : ''}
  </div>
  ${tldr ? `<div class="tldr" data-reveal><b>TL;DR</b>${inline(tldr.replace(/\n+/g, ' '))}</div>` : ''}
  ${toolChips(w.sections['tools used'])}
  ${body}
  ${takeaway ? `<div class="takeaway" data-reveal><b>Key takeaway</b>${takeaway}</div>` : ''}
  ${again ? `<h2 data-reveal>If I Did It Again</h2>\n${mdToHtml(again)}` : ''}
  <div class="cta-row">
    <a class="btn primary" href="https://github.com/${OWNER}/${REPO}/blob/main/${w.dir}/${w.filename}" target="_blank" rel="noopener">Full writeup on GitHub &rarr;</a>
    <a class="btn" href="./">More writeups</a>
  </div>
  <footer>Part of <a href="${SITE_URL}/">thecyberfarhan.github.io</a>. Auto-generated from the <a href="https://github.com/${OWNER}/${REPO}">CTF-Writeups</a> repo — edits happen there, not here.</footer>
</div>
<script>${COPY_BUTTON_SCRIPT}${REVEAL_SCRIPT}${rainScript(tint)}</script>
</body>
</html>`;
}

function hubHtml(writeups) {
  const platforms = [...new Set(writeups.map((w) => w.platform))];
  const difficulties = [...new Set(writeups.map((w) => w.difficulty).filter(Boolean))]
    .sort((a, b) => {
      const ia = DIFFICULTY_ORDER.indexOf(a.toLowerCase()), ib = DIFFICULTY_ORDER.indexOf(b.toLowerCase());
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

  const cards = writeups.map((w, i) => {
    // data-search holds a pre-lowercased, HTML-escaped haystack -- the filter
    // script only ever reads this via .dataset (never writes it back into the
    // DOM), so there's no way a search term can reach innerHTML unescaped.
    const haystack = esc(`${w.title} ${w.summary}`.toLowerCase());
    const tint = tintFor(w.difficulty);
    return `
    <li class="wu-card" data-reveal style="--d:${Math.min(i, 8) * 40}ms;--tint:${tint}" data-platform="${esc(w.platform)}" data-difficulty="${esc(w.difficulty || '')}" data-search="${haystack}">
      <a href="./${w.slug}.html">
        <h3 style="view-transition-name:wu-title-${w.slug}">${esc(w.title)}</h3>
        <p>${esc(w.summary)}</p>
        <div class="meta">
          <span class="plat">${esc(w.platform)}</span>
          ${w.difficulty ? `<span class="diff">${esc(w.difficulty)}</span>` : ''}
        </div>
      </a>
    </li>`;
  }).join('\n');

  const platOptions = platforms.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join('');
  const diffOptions = difficulties.map((d) => `<option value="${esc(d)}">${esc(d)}</option>`).join('');

  const filterScript = `
(function () {
  var cards = Array.prototype.slice.call(document.querySelectorAll('.wu-card'));
  var state = { platform: 'all', difficulty: 'all', q: '' };
  var empty = document.querySelector('.f-empty');
  function apply() {
    var visible = 0;
    cards.forEach(function (card) {
      var matchP = state.platform === 'all' || card.dataset.platform === state.platform;
      var matchD = state.difficulty === 'all' || card.dataset.difficulty === state.difficulty;
      var matchQ = !state.q || card.dataset.search.indexOf(state.q) !== -1;
      var show = matchP && matchD && matchQ;
      var wasHidden = card.classList.contains('wu-hide');
      card.classList.toggle('wu-hide', !show);
      // every apply() is a real filter/search change (nothing calls this on
      // first paint) -- a card that just became visible gets a brief
      // glow-pulse settling in, the "found it" flash
      if (show && wasHidden) {
        card.classList.remove('wu-flash');
        void card.offsetWidth;
        card.classList.add('wu-flash');
      }
      if (show) visible++;
    });
    if (empty) empty.classList.toggle('show', visible === 0);
  }
  // <select> values are the browser's own option values, read via .value --
  // never routed through innerHTML, a selector, or eval, so there's nothing
  // an injected option value could reach even if one were somehow added.
  document.querySelectorAll('.f-select').forEach(function (sel) {
    sel.addEventListener('change', function () { state[sel.dataset.filter] = sel.value; apply(); });
  });
  var search = document.querySelector('.f-search input');
  if (search) {
    // plain substring match against a pre-escaped, pre-lowercased dataset
    // string -- never fed to innerHTML/eval/a selector, so there's nothing
    // here for an injected value to reach regardless of what's typed
    search.addEventListener('input', function () {
      state.q = search.value.toLowerCase().slice(0, 100);
      apply();
    });
  }
  cards.forEach(function (card) {
    card.addEventListener('animationend', function () { card.classList.remove('wu-flash'); });
  });
})();`;

  // mouse-following spotlight on card borders -- pure CSS-variable update,
  // no layout thrash, skipped entirely for touch (no hover to follow)
  const spotlightScript = `
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.querySelectorAll('.wu-card').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });
}`;

  return `<!doctype html>
<html lang="en" data-theme="dark" style="--tint:${DEFAULT_TINT}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="view-transition" content="same-origin">
<title>Writeups — Farhan Hussain</title>
<meta name="description" content="Every TryHackMe and Hack The Box writeup -- recon, foothold, escalation and fixes, written the way I'd hand a report over on an engagement. Filterable by platform and difficulty.">
<link rel="canonical" href="${SITE_URL}/writeups/">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23161b22'/%3E%3Crect x='1' y='1' width='30' height='30' rx='6' fill='none' stroke='%23B4232C' stroke-width='2'/%3E%3Ctext x='16' y='22' font-family='Arial' font-size='18' font-weight='700' text-anchor='middle' fill='%23e6edf3'%3EF%3C/text%3E%3C/svg%3E">
<link rel="stylesheet" href="writeup.css">
</head>
<body>
<canvas id="rain" aria-hidden="true"></canvas>
<div class="wrap">
  <div class="topbar">
    <a class="back" href="${SITE_URL}/">&larr; thecyberfarhan.github.io</a>
    <a class="brand" href="${SITE_URL}/">Farhan<span>.</span></a>
  </div>
  <p class="eyebrow" data-reveal>Writeups</p>
  <h1 data-reveal>Every room, written up</h1>
  <p class="hub-lead" data-reveal>Recon, foothold, escalation, the dead ends, and how I'd fix each hole -- filter by platform or difficulty, or search by name.</p>
  <div class="filters" data-reveal>
    <div class="f-search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <input type="search" placeholder="Search writeups…" maxlength="100" autocomplete="off" spellcheck="false">
    </div>
    <div class="f-select-wrap">
      <select class="f-select" data-filter="platform" aria-label="Filter by platform">
        <option value="all">All platforms</option>${platOptions}
      </select>
      <svg class="f-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
    </div>
    <div class="f-select-wrap">
      <select class="f-select" data-filter="difficulty" aria-label="Filter by difficulty">
        <option value="all">All levels</option>${diffOptions}
      </select>
      <svg class="f-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
    </div>
  </div>
  <ul class="wu-list">${cards}</ul>
  <p class="f-empty">No writeups match those filters.</p>
  <footer>${writeups.length} writeups here, mirrored from <a href="https://github.com/${OWNER}/${REPO}">github.com/${OWNER}/${REPO}</a>.</footer>
</div>
<script>${filterScript}${spotlightScript}${REVEAL_SCRIPT}${rainScript(DEFAULT_TINT)}</script>
</body>
</html>`;
}

// ---------- main ----------

async function main() {
  const all = [];
  for (const { dir, platform } of FOLDERS) {
    const files = await listFiles(dir);
    for (const f of files) {
      const md = await rawFile(dir, f.name);
      const parsed = parseWriteup(md, platform);
      all.push({ ...parsed, dir, filename: f.name, slug: f.name.replace(/_writeup\.md$/, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase() });
    }
  }

  const totalCount = all.length;
  // Every writeup gets an on-site page now -- Easy/Very Easy included. The hub
  // is a full, filterable index, not a curated "medium/hard only" subset; only
  // the main-site ledger below still curates toward the harder ones.
  const pages = [...all];
  pages.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  pages.forEach((w) => { w.onSite = true; });

  // the main site's "Selected writeups" ledger: mostly medium/hard, with one or
  // two easy ones mixed in just to fill out the row count -- not a separate
  // hand-maintained list, so it can never drift the way the old hardcoded one did
  const LEDGER_SIZE = 8, LEDGER_EASY_SLOTS = 2;
  const difficultyRank = (w) => ({ insane: 5, hard: 4, medium: 3, challenge: 2, easy: 1, 'very easy': 0 })[(w.difficulty || '').toLowerCase()] ?? 2;
  const isEasyTier = (w) => EXCLUDE_DIFFICULTY.includes((w.difficulty || '').toLowerCase());
  const byDifficultyThenDate = pages.filter((w) => !isEasyTier(w)).sort((a, b) => {
    const d = difficultyRank(b) - difficultyRank(a);
    return d !== 0 ? d : (b.date || '').localeCompare(a.date || '');
  });
  const easyPool = pages.filter(isEasyTier).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const ledgerItems = [
    ...byDifficultyThenDate.slice(0, LEDGER_SIZE - LEDGER_EASY_SLOTS),
    ...easyPool.slice(0, LEDGER_EASY_SLOTS)
  ];

  const outDir = path.join(SITE_ROOT, 'writeups');
  mkdirSync(outDir, { recursive: true });

  const existing = readdirSync(outDir).filter((f) => f.endsWith('.html') && f !== 'index.html');
  const keepFiles = new Set(pages.map((w) => `${w.slug}.html`));
  for (const f of existing) if (!keepFiles.has(f)) unlinkSync(path.join(outDir, f));

  for (const w of pages) {
    const tldr = stripHr(w.sections['tldr'] || w.sections['tl;dr'] || '');
    w.summary = truncate(tldr, 110);
    writeFileSync(path.join(outDir, `${w.slug}.html`), pageHtml(w, w.slug));
  }
  writeFileSync(path.join(outDir, 'index.html'), hubHtml(pages));

  // sitemap
  const sitemapPath = path.join(SITE_ROOT, 'sitemap.xml');
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    `  <url><loc>${SITE_URL}/</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>1.0</priority></url>`,
    `  <url><loc>${SITE_URL}/writeups/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
    ...pages.map((w) => `  <url><loc>${SITE_URL}/writeups/${w.slug}.html</loc><lastmod>${w.date || today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`)
  ];
  writeFileSync(sitemapPath, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);

  // main site stat + llms.txt -- exact literal replacements only, never a bare
  // /\d+/ regex, so this can never clobber an unrelated number elsewhere on the page
  const indexPath = path.join(SITE_ROOT, 'index.html');
  let indexHtml = readFileSync(indexPath, 'utf8');
  const indexReplacements = [
    [/content="CPENT-certified penetration tester\. \d+ writeups, TryHackMe top 3%\."/, `content="CPENT-certified penetration tester. ${totalCount} writeups, TryHackMe top 3%."`],
    [/CPENT-certified web and API penetration tester\. TryHackMe top 3%, \d+ published writeups\./, `CPENT-certified web and API penetration tester. TryHackMe top 3%, ${totalCount} published writeups.`],
    [/<li>\d+ writeups<\/li>/, `<li>${totalCount} writeups</li>`],
    [/<b data-count="\d+">\d+<\/b><span>published writeups<\/span>/, `<b data-count="${totalCount}">${totalCount}</b><span>published writeups</span>`],
    [/<ol class="ledger">[\s\S]*?<\/ol>/, `<ol class="ledger">\n${ledgerHtml(ledgerItems)}\n  </ol>`],
    [/CTF-Writeups, \d+ and counting/, `CTF-Writeups, ${totalCount} and counting`]
  ];
  for (const [pattern, replacement] of indexReplacements) {
    if (!pattern.test(indexHtml)) throw new Error(`writeup-count anchor not found, site markup changed: ${pattern}`);
    indexHtml = indexHtml.replace(pattern, replacement);
  }
  writeFileSync(indexPath, indexHtml);

  const llmsPath = path.join(SITE_ROOT, 'llms.txt');
  let llms = readFileSync(llmsPath, 'utf8');
  llms = llms.replace(/\d+ public writeups/, `${totalCount} public writeups`);
  llms = llms.replace(/\d+ structured writeups/, `${totalCount} structured writeups`);
  writeFileSync(llmsPath, llms);

  console.log(`Synced ${totalCount} total writeups, all on-site. Ledger picks: ${ledgerItems.map((w) => w.title).join(', ')}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
