// Build-time reshaping of a project README's section HTML (as written by sync-projects.mjs) into
// the richer blocks the project page shows. Pure string work: no new content is invented, the
// README stays the single source.

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// "What changed": every "### Fixed: ..." / "### Added: ..." entry becomes a numbered card. The
// word before the colon becomes the card's tag; a heading with no recognised word keeps a
// neutral "Change" tag. Anything before the first ### stays as ordinary prose above the cards.
const KINDS: Record<string, string> = { fixed: 'Fixed', added: 'Added', changed: 'Changed', modernized: 'Modernised', modernised: 'Modernised', housekeeping: 'Housekeeping' };
export function changeCards(html: string) {
  const parts = html.split(/(?=<h3>)/);
  const intro = parts[0].startsWith('<h3>') ? '' : parts.shift()!;
  if (!parts.length) return html;
  const cards = parts.map((part, i) => {
    const m = /^<h3>([\s\S]*?)<\/h3>([\s\S]*)$/.exec(part);
    if (!m) return part;
    let title = m[1].trim();
    const k = /^(fixed|added|changed|moderni[sz]ed|housekeeping)\b:?\s*/i.exec(title);
    const key = k ? k[1].toLowerCase() : 'change';
    if (k) title = title.slice(k[0].length);
    const tag = KINDS[key] ?? 'Change';
    return `<article class="fix" data-kind="${tag.toLowerCase()}"><header class="fix-h"><span class="fix-n">${String(i + 1).padStart(2, '0')}</span><span class="fix-tag">${tag}</span></header>${title ? `<h3>${title}</h3>` : ''}<div class="fix-b">${m[2].trim()}</div></article>`;
  });
  return `${intro}<div class="fixes">${cards.join('')}</div>`;
}

// "Example output": each code block gets terminal window chrome so the page can replay it.
export function terminalFrames(html: string, name: string) {
  return html.replace(/<pre class="shiki" data-lang="([\w+-]+)">[\s\S]*?<\/pre>/g, (pre, lang) => {
    const label = lang === 'json' ? `${name} · JSON output` : `${name} · output`;
    return `<figure class="term"><figcaption class="term-bar"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="term-t">${esc(label)}</span><button type="button" class="term-replay" hidden>Replay</button></figcaption>${pre}</figure>`;
  });
}
