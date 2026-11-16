// Colours the code blocks the sync scripts write as plain `<pre><code class="language-x">`.
// Runs at build time only, so no highlighter ships to the browser. Code blocks sit on the dark
// --code-bg in both site themes, so one dark theme is enough.
import { createHighlighter, type Highlighter } from 'shiki';

const THEME = 'github-dark-default';
const LANGS = ['bash', 'shell', 'json', 'python', 'html', 'xml', 'javascript', 'php', 'sql', 'c', 'groovy', 'powershell', 'ini', 'yaml', 'http'];
const ALIAS: Record<string, string> = { sh: 'bash', zsh: 'bash', console: 'bash', py: 'python', js: 'javascript', ps1: 'powershell', yml: 'yaml' };

let highlighter: Promise<Highlighter> | null = null;
const get = () => (highlighter ??= createHighlighter({ themes: [THEME], langs: LANGS }));

const unescape = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

export async function highlightBlocks(html: string) {
  if (!html || !html.includes('<pre><code')) return html;
  const hl = await get();
  return html.replace(/<pre><code(?: class="language-([\w+-]+)")?>([\s\S]*?)<\/code><\/pre>/g, (_, lang = 'text', body) => {
    const name = ALIAS[lang] ?? lang;
    const use = hl.getLoadedLanguages().includes(name) ? name : 'text';
    const out = hl.codeToHtml(unescape(body), { lang: use, theme: THEME });
    // keep the site's own block styling: drop Shiki's inline background/colour and tabindex
    return out.replace(/^<pre class="shiki[^"]*"[^>]*>/, `<pre class="shiki" data-lang="${use}">`);
  });
}
