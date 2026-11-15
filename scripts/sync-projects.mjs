#!/usr/bin/env node
/* Finds every public GitHub repo tagged with the topic "portfolio-project", reads its README
 * (written to docs/tool-readme-standard.md) and writes src/data/projects.json. Astro builds
 * every project page, the home page cards, the sitemap and llms.txt from that one file, the
 * same way scripts/sync-writeups.mjs builds the writeups from CTF-Writeups.
 *
 * Run: npm run sync:projects   (GITHUB_TOKEN is optional locally, used in CI for rate limits)
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../src/data/projects.json');
const OWNER = 'thecyberfarhan';
const TOPIC = 'portfolio-project';

const gh = (url) => fetch(url, {
  headers: {
    Accept: 'application/vnd.github.v3+json',
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {})
  }
});

async function listRepos() {
  const repos = [];
  for (let page = 1; ; page++) {
    const res = await gh(`https://api.github.com/users/${OWNER}/repos?per_page=100&page=${page}&type=public`);
    if (!res.ok) throw new Error(`listing repos failed: ${res.status}`);
    const batch = await res.json();
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  return repos.filter((r) => (r.topics || []).includes(TOPIC));
}

async function rawReadme(repo, branch) {
  // the contents API, not the raw.githubusercontent.com CDN: the CDN edge-caches a file for up
  // to 5 minutes after a push, which would make testing a README change right after pushing it
  // look broken for no reason. The API reflects a push immediately.
  for (const name of ['README.md', 'readme.md', 'Readme.md']) {
    const res = await gh(`https://api.github.com/repos/${OWNER}/${repo}/contents/${name}?ref=${branch}`);
    if (res.ok) { const data = await res.json(); return Buffer.from(data.content, 'base64').toString('utf8'); }
  }
  throw new Error('no README.md found');
}

// ---------- tiny markdown -> html (trimmed from sync-writeups.mjs's version) ----------

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function resolveHref(url, repo, branch) {
  if (/^(https?:|mailto:|#)/i.test(url)) return url;
  const clean = url.replace(/^\.\//, '');
  return `https://github.com/${OWNER}/${repo}/blob/${branch}/${clean}`;
}
function inline(s, repo, branch) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => {
      const href = resolveHref(u, repo, branch);
      return /^https?:/i.test(href) ? `<a href="${href}" target="_blank" rel="noopener noreferrer">${t}</a>` : `<a href="${href}">${t}</a>`;
    });
}
function tableToHtml(rows, repo, branch) {
  const cells = rows.map((r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  const [header, sep, ...body] = cells;
  if (!sep || !sep.every((c) => /^:?-+:?$/.test(c))) return null;
  return {
    header, body,
    html: `<div class="table-wrap"><table><thead><tr>${header.map((h) => `<th>${inline(h, repo, branch)}</th>`).join('')}</tr></thead><tbody>${
      body.map((r) => `<tr>${r.map((c) => `<td>${inline(c, repo, branch)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
  };
}
function mdToHtml(md, repo, branch) {
  if (!md) return '';
  const out = [];
  const fenceRe = /```[a-z]*\n([\s\S]*?)```/g;
  let last = 0, m;
  while ((m = fenceRe.exec(md))) {
    out.push(textBlockToHtml(md.slice(last, m.index), repo, branch));
    out.push(`<pre><code>${esc(m[1].replace(/\n$/, ''))}</code></pre>`);
    last = fenceRe.lastIndex;
  }
  out.push(textBlockToHtml(md.slice(last), repo, branch));
  return out.filter(Boolean).join('\n');
}
// a markdown list item that wraps across lines (common when a README is hand-wrapped at ~100
// chars) has its continuation lines un-indented and with no '-'/'1.' marker; without this, the
// loop that collects list items stopped at the first continuation line, closing the <ul> after
// one line and dumping the rest of that sentence as a stray paragraph right after it
function listToHtml(lines, start, markerRe, tag, repo, branch) {
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
  const html = `<${tag}>${items.map((it) => `<li>${inline(it, repo, branch)}</li>`).join('')}</${tag}>`;
  return { html, nextIndex: i };
}

function textBlockToHtml(text, repo, branch) {
  const lines = text.split('\n');
  const out = [];
  let i = 0, para = [];
  const flushPara = () => { const t = para.join(' ').trim(); if (t) out.push(`<p>${inline(t, repo, branch)}</p>`); para = []; };
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { flushPara(); i++; continue; }
    if (/^###\s+/.test(line)) { flushPara(); out.push(`<h3>${inline(line.replace(/^###\s+/, ''), repo, branch)}</h3>`); i++; continue; }
    if (/^\|/.test(line.trim())) {
      flushPara();
      const tbl = [];
      while (i < lines.length && /^\|/.test(lines[i].trim())) tbl.push(lines[i++].trim());
      const t = tableToHtml(tbl, repo, branch);
      if (t) out.push(t.html);
      continue;
    }
    if (/^>\s?/.test(line)) {
      flushPara();
      const q = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${inline(q.join(' '), repo, branch)}</blockquote>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushPara();
      const { html, nextIndex } = listToHtml(lines, i, /^[-*]\s+/, 'ul', repo, branch);
      out.push(html);
      i = nextIndex;
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      flushPara();
      const { html, nextIndex } = listToHtml(lines, i, /^\d+\.\s+/, 'ol', repo, branch);
      out.push(html);
      i = nextIndex;
      continue;
    }
    if (/^!\[/.test(line.trim())) { i++; continue; } // images are dropped
    para.push(line.trim());
    i++;
  }
  flushPara();
  return out.join('\n');
}

// ---------- parsing a README into a record ----------

const slugify = (s) => s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// README headings normalised to a known id/label, so pages, the lint tool and the standard
// agree on what each section is called. Anything not listed here keeps its own slug and text,
// and is still shown -- it just isn't recognised as one of the standard sections.
const KNOWN = {
  'why': 'Why',
  'what this shows': 'What this shows',
  'requirements': 'Requirements',
  'install': 'Install',
  'installation': 'Install',
  'usage': 'Usage',
  'options': 'Options',
  'example output': 'Example output',
  "what it checks": 'What it checks',
  "what's inside": "What's inside",
  'how it works': 'How it works',
  'comparison': 'Comparison',
  'what changed': 'What changed',
  'scope': 'Scope',
  'method': 'Method',
  'findings': 'Findings',
  'testing': 'Testing',
  'limitations': 'Limitations',
  'responsible use': 'Responsible use',
  'credits': 'Credits',
  'license': 'License',
};

function splitSections(md) {
  // returns [{ heading: raw text, body: string }], split on ## (not ###), "At a glance" separated out.
  // A fenced code block (example output, a sample report) can itself contain lines starting
  // with "##" -- those are data, not real section headers, so heading lines inside a fence are
  // never treated as a split point.
  const parts = [];
  let cur = null, buf = [], inFence = false;
  const flush = () => { if (cur) parts.push({ heading: cur, body: buf.join('\n').trim() }); };
  for (const line of md.split('\n')) {
    if (/^```/.test(line.trim())) { inFence = !inFence; if (cur) buf.push(line); continue; }
    const m = !inFence && /^##\s+(.+)$/.exec(line);
    if (m) { flush(); cur = m[1].replace(/[`*]/g, '').trim(); buf = []; }
    else if (cur) buf.push(line);
  }
  flush();
  return parts;
}

function parseGlanceTable(body) {
  const rows = body.split('\n').filter((l) => /^\|/.test(l.trim()));
  const cells = rows.map((r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  const glance = {};
  for (const row of cells) {
    if (row.length < 2) continue;
    const key = row[0].replace(/\*\*/g, '').replace(/[`:]/g, '').trim();
    const val = row[1].replace(/\*\*/g, '').trim();
    if (!key || /^-+$/.test(key) || /^:?-+:?$/.test(val)) continue; // header/separator row
    if (val) glance[key] = val.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // strip markdown links, keep text
  }
  return glance;
}

function parseReadme(md, repo, branch, repoMeta) {
  const h1Match = /^#\s+([^\n]+)/.exec(md.trim());
  const name = h1Match ? h1Match[1].trim() : repo;
  const afterH1 = h1Match ? md.slice(md.indexOf(h1Match[0]) + h1Match[0].length) : md;
  // a tagline can wrap onto several "> " lines; strip the marker from each one, not just the first
  const taglineMatch = /^\s*\n*((?:>.*\n?)+)/.exec(afterH1);
  const tagline = taglineMatch
    ? taglineMatch[1].split('\n').map((l) => l.replace(/^>\s?/, '')).join(' ').replace(/\s+/g, ' ').trim()
    : (repoMeta.description || '');

  const rawSections = splitSections(md);
  const glanceSection = rawSections.find((s) => /^at a glance$/i.test(s.heading));
  const glance = glanceSection ? parseGlanceTable(glanceSection.body) : {};

  const sections = rawSections
    .filter((s) => !/^at a glance$/i.test(s.heading))
    .map((s) => {
      const key = s.heading.toLowerCase().replace(/\s+/g, ' ').trim();
      const label = KNOWN[key] || s.heading;
      const id = KNOWN[key] ? slugify(KNOWN[key]) : slugify(s.heading);
      return { id, label, known: !!KNOWN[key], html: mdToHtml(s.body, repo, branch) };
    });

  return { name, tagline, glance, sections };
}

// which skill the project shows an employer, for filtering; falls back to a sane default
const SKILL_FALLBACK = { Fork: 'Tooling and automation', Original: 'Web and API testing', 'Field note': 'Reporting' };

function toRecord(repo, md, branch) {
  const parsed = parseReadme(md, repo.name, branch, repo);
  const glance = parsed.glance;
  const kind = /^original$/i.test(glance['Kind'] || '') ? 'Original'
    : /^field note$/i.test(glance['Kind'] || '') ? 'Field note'
    : 'Fork';
  return {
    slug: slugify(repo.name),
    name: parsed.name,
    tagline: parsed.tagline,
    kind,
    status: glance['Status'] || (repo.archived ? 'Archived' : 'Active'),
    language: glance['Language'] || repo.language || null,
    requires: glance['Requires'] || null,
    license: glance['License'] || repo.license?.spdx_id || null,
    upstream: glance['Upstream'] || repo.parent?.full_name || null,
    upstreamStars: repo.parent?.stargazers_count ?? null,
    scope: glance['Scope'] || null,
    skillArea: glance['Skill area'] || SKILL_FALLBACK[kind],
    stars: repo.stargazers_count,
    pushedAt: repo.pushed_at ? repo.pushed_at.slice(0, 10) : null,
    href: repo.html_url,
    sections: parsed.sections,
  };
}

const KIND_ORDER = { Original: 0, Fork: 1, 'Field note': 2 };

async function main() {
  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { projects: [] };
  const prevBySlug = new Map(prev.projects.map((p) => [p.slug, p]));
  const repos = await listRepos();
  const records = [];
  const kept = [];
  for (const repo of repos) {
    const slug = slugify(repo.name);
    try {
      const md = await rawReadme(repo.name, repo.default_branch);
      records.push(toRecord(repo, md, repo.default_branch));
    } catch (err) {
      console.warn(`! ${repo.name}: ${err.message}`);
      if (prevBySlug.has(slug)) { records.push(prevBySlug.get(slug)); kept.push(slug); }
    }
  }
  records.sort((a, b) => (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9) || a.name.localeCompare(b.name));
  if (kept.length) console.warn(`Kept the previous copy of: ${kept.join(', ')}`);

  if (prev.projects.length && records.length < prev.projects.length / 2) {
    console.warn(`Only ${records.length} projects found (was ${prev.projects.length}); keeping the previous file.`);
    return;
  }
  const json = JSON.stringify({ generated: new Date().toISOString().slice(0, 10), projects: records }, null, 1);
  if (JSON.stringify(prev.projects) === JSON.stringify(records)) { console.log(`No change (${records.length} projects).`); return; }
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, json + '\n');
  console.log(`Wrote ${records.length} projects to src/data/projects.json`);
}

main().catch((err) => { console.error(`Sync failed, keeping the existing projects: ${err.message}`); process.exitCode = 0; });
