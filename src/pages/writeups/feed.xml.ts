import { SITE, writeups } from '../../data/site';

// An RSS feed of the writeups, newest first. Feed readers and search engines poll it, so a new
// writeup is announced the next time the site rebuilds after the CTF-Writeups sync.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function GET() {
  const items = [...writeups]
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .map((w) => {
      const url = `${SITE.url}/writeups/${w.slug}.html`;
      return `    <item>
      <title>${esc(`${w.title} (${w.platform}${w.difficulty ? `, ${w.difficulty}` : ''})`)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      ${w.date ? `<pubDate>${new Date(w.date + 'T12:00:00Z').toUTCString()}</pubDate>` : ''}
      <description>${esc(w.summary ?? '')}</description>
    </item>`;
    });
  const newest = writeups.map((w) => w.date ?? '').sort().pop();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE.name)} · Writeups</title>
    <link>${SITE.url}/writeups/</link>
    <atom:link href="${SITE.url}/writeups/feed.xml" rel="self" type="application/rss+xml" />
    <description>Penetration testing writeups from TryHackMe and Hack The Box: what I found, how, and how to fix it.</description>
    <language>en</language>
    ${newest ? `<lastBuildDate>${new Date(newest + 'T12:00:00Z').toUTCString()}</lastBuildDate>` : ''}
${items.join('\n')}
  </channel>
</rss>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
