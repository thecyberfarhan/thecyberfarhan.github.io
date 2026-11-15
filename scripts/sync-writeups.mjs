#!/usr/bin/env node
/* Pulls every writeup from thecyberfarhan/CTF-Writeups (TryHackme/ + HackTheBox/),
 * parses the shared template they're written in, and writes src/data/writeups.json.
 * Astro builds every page, count, the sitemap and llms.txt from that one file, so
 * nothing on the site is patched by regex any more.
 *
 * Run: npm run sync   (GITHUB_TOKEN is optional locally, used in CI for rate limits)
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../src/data/writeups.json');
const OWNER = 'thecyberfarhan', REPO = 'CTF-Writeups';
const FOLDERS = [
  { dir: 'TryHackme', platform: 'TryHackMe' },
  { dir: 'HackTheBox', platform: 'Hack The Box' }
];

const gh = (url) => fetch(url, {
  headers: {
    Accept: 'application/vnd.github.v3+json',
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {})
  }
});

async function listFiles(dir) {
  const res = await gh(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${dir}`);
  if (!res.ok) throw new Error(`listing ${dir} failed: ${res.status}`);
  return (await res.json()).filter((f) => f.type === 'file' && f.name.endsWith('.md'));
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
  const sections = {};
  let cur = null, buf = [];
  const flush = () => { if (cur) sections[cur] = buf.join('\n').trim(); };
  for (const line of md.split('\n')) {
    const m = /^##\s+(.+)$/.exec(line);
    if (m && !/^###/.test(line)) { flush(); cur = normKey(m[1]); buf = []; }
    else if (cur) buf.push(line);
  }
  flush();
  return sections;
}

function parseWriteup(md, platform) {
  const head = md.slice(0, 2000);
  // first line only: an unrestricted scan would match a "# whoami" root prompt inside a code block
  const titleMatch = /^#\s+([^\n]+)/.exec(md.slice(0, 120));
  let title = titleMatch
    ? titleMatch[1]
      .replace(/^(THM|HTB)\s*[—-]\s*/i, '')
      .replace(/\s*[—-]\s*(TryHackMe|Hack\s*The\s*Box)\s*(Writeup)?\s*$/i, '')
      .trim()
    : null;

  const bannerMatch = /```\s*\n([\s\S]*?)```/.exec(md);
  let bannerTail = null;
  if (bannerMatch) {
    const lines = bannerMatch[1].split('\n').map((l) => l.trim()).filter(Boolean);
    bannerTail = lines[lines.length - 1] || null;
  }
  if (!title && bannerTail) title = bannerTail.replace(/^(TryHackMe|HackTheBox|Hack The Box)\s*[—-]\s*/i, '').trim();

  let difficulty = null;
  const diffMatch = /\*\*Difficulty:\*\*\s*([^|\n]+)/i.exec(head);
  if (diffMatch) difficulty = diffMatch[1].trim().replace(/\s*\(.*?\)\s*$/, '');
  else if (bannerTail) {
    const tail = bannerTail.toLowerCase();
    const hit = ['very easy', 'easy', 'medium', 'hard', 'insane'].find((k) => tail.includes(k));
    if (hit) difficulty = hit.replace(/\b\w/g, (c) => c.toUpperCase());
    else if (/custom|challenge/i.test(bannerTail)) difficulty = 'Challenge';
    // HTB's Starting Point track is the beginner tier and never states a difficulty word
    else if (/starting point/i.test(bannerTail)) difficulty = 'Very Easy';
  }

  let date = null;
  const dateMatch = /\*\*Date:\*\*\s*([\d-]{10})/.exec(head);
  if (dateMatch) date = dateMatch[1];
  else {
    const cl = /Last updated:\s*(\d{1,2}\s+\w+\s+\d{4})/i.exec(md);
    if (cl) { const d = new Date(cl[1]); if (!isNaN(d)) date = d.toISOString().slice(0, 10); }
  }
  if (!date) {
    // newer template: first row of the "## Changelog" table, e.g. "| 1.0 | 2026-11-06 | Initial writeup |"
    const log = /^##\s+Changelog[\s\S]*?\|\s*[\d.]+\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|/m.exec(md);
    if (log) date = log[1];
  }

  return { title: title || 'Untitled', difficulty, date, platform, sections: splitSections(md) };
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
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function safeHref(url) {
  return /^(https?:|mailto:|#|\/|\.\/)/i.test(url) ? url : '#';
}
function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => {
      const href = safeHref(u);
      return /^https?:/i.test(href) ? `<a href="${href}" rel="noopener noreferrer nofollow">${t}</a>` : `<a href="${href}">${t}</a>`;
    });
}

function mdToHtml(md) {
  if (!md) return '';
  const out = [];
  const fenceRe = /```[a-z]*\n([\s\S]*?)```/g;
  let last = 0, m;
  while ((m = fenceRe.exec(md))) {
    out.push(textBlockToHtml(md.slice(last, m.index)));
    out.push(`<pre><code>${esc(m[1].replace(/\n$/, ''))}</code></pre>`);
    last = fenceRe.lastIndex;
  }
  out.push(textBlockToHtml(md.slice(last)));
  return out.filter(Boolean).join('\n');
}

// a markdown list item that wraps across lines (common when a write-up is hand-wrapped at ~100
// chars) has its continuation lines un-indented and with no '-'/'1.' marker; without this, the
// loop that collects list items stopped at the first continuation line, closing the <ul> after
// one line and dumping the rest of that sentence as a stray paragraph right after it
function listToHtml(lines, start, markerRe, tag) {
  const items = [];
  let i = start;
  while (i < lines.length) {
    const l = lines[i];
    if (markerRe.test(l)) {
      items.push(l.replace(markerRe, ''));
      i++;
    } else if (l.trim() && !/^#{1,6}\s/.test(l) && !/^\|/.test(l.trim()) && !/^>\s?/.test(l) && !/^```/.test(l.trim())) {
      items[items.length - 1] += ' ' + l.trim();
      i++;
    } else {
      break;
    }
  }
  const html = `<${tag}>${items.map((it) => `<li>${inline(it)}</li>`).join('')}</${tag}>`;
  return { html, nextIndex: i };
}

function textBlockToHtml(text) {
  const lines = text.split('\n');
  const out = [];
  let i = 0, para = [];
  const flushPara = () => { const t = para.join(' ').trim(); if (t) out.push(`<p>${inline(t)}</p>`); para = []; };
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || /^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) { flushPara(); i++; continue; }
    if (/^###\s+/.test(line)) { flushPara(); out.push(`<h3>${inline(cleanHeading(line.replace(/^###\s+/, '')))}</h3>`); i++; continue; }
    if (/^\|/.test(line.trim())) {
      flushPara();
      const tbl = [];
      while (i < lines.length && /^\|/.test(lines[i].trim())) tbl.push(lines[i++].trim());
      out.push(tableToHtml(tbl));
      continue;
    }
    if (/^>\s?/.test(line)) {
      flushPara();
      const q = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${inline(q.join(' ').replace(/^💡\s*\*\*Takeaway:\*\*\s*/, ''))}</blockquote>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushPara();
      const { html, nextIndex } = listToHtml(lines, i, /^[-*]\s+/, 'ul');
      out.push(html);
      i = nextIndex;
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      flushPara();
      const { html, nextIndex } = listToHtml(lines, i, /^\d+\.\s+/, 'ol');
      out.push(html);
      i = nextIndex;
      continue;
    }
    if (/^\*[^*]/.test(line.trim()) && line.trim().endsWith('*') && !line.includes('**')) {
      flushPara(); out.push(`<p class="aside">${inline(line.trim().slice(1, -1))}</p>`); i++; continue;
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
  const sev = (v) => /critical/i.test(v) ? ' class="sev-critical"' : /high/i.test(v) ? ' class="sev-high"' : /medium/i.test(v) ? ' class="sev-medium"' : '';
  return `<div class="table-wrap"><table><thead><tr>${header.map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${
    body.map((r) => `<tr>${r.map((c) => `<td${sev(c)}>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function toolList(section) {
  if (!section) return [];
  const rows = section.split('\n').filter((l) => /^\|/.test(l.trim()));
  if (rows.length > 2) {
    // newer template: "| Tool | Purpose |" table, first column is the tool
    return rows.slice(2).map((r) => r.replace(/^\|/, '').split('|')[0].replace(/[*`]/g, '').trim()).filter(Boolean);
  }
  return section.split('\n').filter((l) => /^[-*]\s+/.test(l)).map((l) => {
    const rest = l.replace(/^[-*]\s+/, '').replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})️?\s*/u, '');
    return rest.split(/\s+[—-]\s+/)[0].replace(/[*`]/g, '').trim();
  }).filter(Boolean);
}

function plain(md) {
  return md.split('\n').map((l) => l.replace(/^>\s?/, '')).join(' ')
    .replace(/^💡\s*\*\*Takeaway:\*\*\s*/, '').replace(/[*`]/g, '').replace(/\s+/g, ' ').trim();
}

// [id, label, ...heading keys it may appear under across the two templates]
const SECTION_ORDER = [
  ['introduction', 'Introduction', 'introduction'],
  ['recon', 'Recon', 'recon', 'reconnaissance'],
  ['foothold', 'Foothold', 'foothold'],
  ['shell', 'Shell and access', 'shell access', 'shell initial access', 'initial access'],
  ['escalation', 'Escalation', 'escalation', 'escalation path', 'privilege escalation'],
  ['chain', 'The full chain', 'exploitation'],
  ['rabbit-holes', 'Rabbit holes', 'rabbit holes'],
  ['mitigations', 'Mitigations', 'mitigations']
];

function toRecord(w) {
  const s = w.sections;
  const tldrRaw = stripHr(s['tldr'] || s['tl;dr'] || '');
  const takeRaw = s['key takeaway'] ? stripHr(s['key takeaway']) : '';
  const againRaw = s['if i did it again'] ? stripHr(s['if i did it again']) : '';
  return {
    slug: w.slug,
    title: w.title,
    platform: w.platform,
    difficulty: w.difficulty,
    date: w.date,
    github: `https://github.com/${OWNER}/${REPO}/blob/main/${w.dir}/${w.filename}`,
    summary: tldrRaw ? truncate(tldrRaw, 150) : `${w.platform} writeup: ${w.title}.`,
    takeaway: takeRaw ? plain(takeRaw) : '',
    tldrHtml: tldrRaw ? inline(tldrRaw.replace(/\n+/g, ' ')) : '',
    tools: toolList(s['tools used']),
    sections: SECTION_ORDER.map(([id, label, ...keys]) => {
      const k = keys.find((key) => s[key]);
      return k ? { id, label, html: mdToHtml(s[k]) } : null;
    }).filter(Boolean),
    takeawayHtml: takeRaw ? inline(plain(takeRaw)) : '',
    againHtml: againRaw ? mdToHtml(againRaw) : ''
  };
}

async function main() {
  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { writeups: [] };
  const prevBySlug = new Map(prev.writeups.map((w) => [w.slug, w]));
  const all = [];
  const kept = [];
  for (const { dir, platform } of FOLDERS) {
    for (const f of await listFiles(dir)) {
      const slug = f.name.replace(/_writeup\.md$/, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      // one broken or unreachable file must not take the rest down: keep its last good copy
      try {
        const parsed = parseWriteup(await rawFile(dir, f.name), platform);
        all.push(toRecord({ ...parsed, dir, filename: f.name, slug }));
      } catch (err) {
        console.warn(`! ${dir}/${f.name}: ${err.message}`);
        if (prevBySlug.has(slug)) { all.push(prevBySlug.get(slug)); kept.push(slug); }
      }
    }
  }
  all.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const records = all;
  if (kept.length) console.warn(`Kept the previous copy of: ${kept.join(', ')}`);

  // a sudden drop usually means the API answered with something odd, not that writeups were deleted
  if (prev.writeups.length && records.length < prev.writeups.length / 2) {
    console.warn(`Only ${records.length} writeups found (was ${prev.writeups.length}); keeping the previous file.`);
    return;
  }
  const json = JSON.stringify({ generated: new Date().toISOString().slice(0, 10), writeups: records }, null, 1);

  // only rewrite when the writeups themselves changed, so CI does not commit a new date every run
  if (JSON.stringify(prev.writeups) === JSON.stringify(records)) { console.log(`No change (${records.length} writeups).`); return; }
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, json + '\n');
  console.log(`Wrote ${records.length} writeups to src/data/writeups.json`);
}

// if GitHub cannot be reached at all, the build carries on with the writeups it already has
main().catch((err) => { console.error(`Sync failed, keeping the existing writeups: ${err.message}`); process.exitCode = 0; });
