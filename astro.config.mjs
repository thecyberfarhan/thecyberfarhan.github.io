import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateCharacter } from '@bible-strong/avatar-core';

// Scout's character is checked here with the real validator, so the browser bundle can skip it
const scout = validateCharacter(JSON.parse(readFileSync(new URL('./src/data/scout.avatar.json', import.meta.url), 'utf8')));
if (!scout.ok) throw new Error(`scout.avatar.json is invalid: ${JSON.stringify(scout.errors[0])}`);

export default defineConfig({
  site: 'https://thecyberfarhan.github.io',
  trailingSlash: 'ignore',
  // 'preserve' keeps the old public URLs exactly (writeups/internal.html), which
  // scheduled LinkedIn posts and search results already point at
  build: { format: 'preserve' },
  // a Content Security Policy on every page (as a <meta>, since GitHub Pages cannot set headers):
  // scripts only from this site or with a build-time hash, nothing loaded from anywhere else.
  // Styles allow inline because components pass colours through style="--tone: ..." attributes.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "manifest-src 'self'",
        "worker-src 'self'",
        'upgrade-insecure-requests',
      ],
      styleDirective: { resources: ["'self'", "'unsafe-inline'"] },
    },
  },
  vite: {
    resolve: { alias: [{ find: /^ajv\/dist\/2020\.js$/, replacement: fileURLToPath(new URL('./src/shims/ajv-noop.js', import.meta.url)) }] },
  },
  integrations: [
    sitemap({
      filter: (page) => !/\/vault\/?$/.test(page),
      // with format 'preserve' the sitemap drops ".html" and index slashes; write each URL
      // the way the page's canonical link does, so search engines see one address per page
      serialize(item) {
        const url = new URL(item.url);
        if (url.pathname !== '/') {
          const p = url.pathname.replace(/\/$/, '');
          url.pathname = ['/lab', '/writeups'].includes(p) ? p + '/' : p + '.html';
        }
        item.url = url.href;
        return item;
      },
    }),
    // the old site published /sitemap.xml and Search Console still points there, so keep that address
    {
      name: 'sitemap-alias',
      hooks: { 'astro:build:done': ({ dir }) => copyFileSync(new URL('sitemap-0.xml', dir), new URL('sitemap.xml', dir)) },
    },
  ],
});
