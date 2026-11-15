#!/usr/bin/env node
/* Checks every repo tagged "portfolio-project" (or one named on the command line) against
 * docs/tool-readme-standard.md: does it have an H1 and tagline, an "At a glance" table with a
 * Kind, and every section that kind requires. Read-only -- it never edits a repo or writes a
 * file; it's the "does my README follow the standard" check the docs point to.
 *
 * Run: npm run lint:readmes            (every tagged repo)
 *      npm run lint:readmes -- corsy   (one repo)
 */
const OWNER = 'thecyberfarhan';
const TOPIC = 'portfolio-project';
const only = process.argv[2]?.toLowerCase();

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
  for (const name of ['README.md', 'readme.md', 'Readme.md']) {
    const res = await gh(`https://api.github.com/repos/${OWNER}/${repo}/contents/${name}?ref=${branch}`);
    if (res.ok) { const data = await res.json(); return Buffer.from(data.content, 'base64').toString('utf8'); }
  }
  return null;
}

function splitSections(md) {
  const parts = [];
  let cur = null, buf = [], inFence = false;
  const flush = () => { if (cur) parts.push({ heading: cur, body: buf.join('\n').trim() }); };
  for (const line of md.split('\n')) {
    if (/^```/.test(line.trim())) { inFence = !inFence; continue; }
    const m = !inFence && /^##\s+(.+)$/.exec(line);
    if (m) { flush(); cur = m[1].replace(/[`*]/g, '').trim(); buf = []; }
    else if (cur) buf.push(line);
  }
  flush();
  return parts;
}
function parseGlance(body) {
  const rows = body.split('\n').filter((l) => /^\|/.test(l.trim()));
  const cells = rows.map((r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  const glance = {};
  for (const row of cells) {
    if (row.length < 2) continue;
    const key = row[0].replace(/\*\*/g, '').replace(/[`:]/g, '').trim();
    const val = row[1].replace(/\*\*/g, '').trim();
    if (!key || /^-+$/.test(key) || /^:?-+:?$/.test(val)) continue;
    if (val) glance[key] = val;
  }
  return glance;
}

const KNOWN = new Set([
  'why', 'what this shows', 'requirements', 'install', 'installation', 'usage', 'options',
  'example output', 'what it checks', "what's inside", 'how it works', 'comparison',
  'what changed', 'scope', 'method', 'findings', 'testing', 'limitations', 'responsible use',
  'credits', 'license',
]);

// one entry per required heading; an array means "any one of these satisfies it"
const REQUIRED = {
  Original: ['why', 'what this shows', 'requirements', 'install', 'usage', 'options', 'testing', 'responsible use', 'license'],
  Fork: ['why', 'what this shows', 'requirements', 'install', 'usage', 'options', 'comparison', 'what changed', 'testing', 'responsible use', 'credits', 'license'],
  'Field note': ['why', 'what this shows', ['what it checks', "what's inside"], 'method', 'responsible use', 'license'],
};

function check(name, md) {
  const problems = [];
  const h1 = /^#\s+(.+)$/m.exec(md);
  if (!h1) problems.push('No "# Name" heading.');
  const tagline = /^\s*\n*>\s*\S/.test(md.slice(h1 ? md.indexOf(h1[0]) + h1[0].length : 0));
  if (!tagline) problems.push('No one-line ">" tagline right under the H1.');

  const sections = splitSections(md);
  const glanceSection = sections.find((s) => /^at a glance$/i.test(s.heading));
  if (!glanceSection) { problems.push('No "## At a glance" section.'); return { kind: null, problems, unknown: [] }; }
  const glance = parseGlance(glanceSection.body);
  const kind = glance['Kind'];
  if (!kind || !REQUIRED[kind]) { problems.push(`"At a glance" has no recognised Kind row (got ${JSON.stringify(kind)}).`); return { kind: kind ?? null, problems, unknown: [] }; }

  const have = new Set(sections.map((s) => s.heading.toLowerCase().replace(/\s+/g, ' ').trim()));
  for (const req of REQUIRED[kind]) {
    const ok = Array.isArray(req) ? req.some((r) => have.has(r)) : have.has(req);
    if (!ok) problems.push(`Missing required section: ${Array.isArray(req) ? req.map((r) => `"## ${r}"`).join(' or ') : `"## ${req}"`}`);
  }
  const unknown = sections.filter((s) => !/^at a glance$/i.test(s.heading) && !KNOWN.has(s.heading.toLowerCase())).map((s) => s.heading);
  return { kind, problems, unknown };
}

async function main() {
  const repos = (await listRepos()).filter((r) => !only || r.name.toLowerCase() === only);
  if (only && repos.length === 0) { console.error(`No portfolio-project repo named "${only}" found.`); process.exitCode = 1; return; }
  let failed = 0;
  for (const repo of repos.sort((a, b) => a.name.localeCompare(b.name))) {
    const md = await rawReadme(repo.name, repo.default_branch);
    if (!md) { console.log(`✗ ${repo.name}: no README.md found`); failed++; continue; }
    const { kind, problems, unknown } = check(repo.name, md);
    if (problems.length) {
      failed++;
      console.log(`✗ ${repo.name} (${kind ?? 'unknown kind'})`);
      problems.forEach((p) => console.log(`    - ${p}`));
    } else {
      console.log(`✓ ${repo.name} (${kind})`);
    }
    if (unknown.length) console.log(`    note: unrecognised heading(s), kept on the page: ${unknown.join(', ')}`);
  }
  console.log(`\n${repos.length - failed}/${repos.length} READMEs follow the standard.`);
  if (failed) process.exitCode = 1;
}

main().catch((err) => { console.error(err.message); process.exitCode = 1; });
