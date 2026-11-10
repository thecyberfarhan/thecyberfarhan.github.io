# thecyberfarhan.github.io

My personal portfolio: [thecyberfarhan.github.io](https://thecyberfarhan.github.io). A static site, hand-built with no framework — plain HTML, CSS and vanilla JavaScript, built with esbuild into a single minified bundle and hosted on GitHub Pages.

## Stack and structure

```
index.html            the whole page: markup + an inlined <style> block
src/app.js             readable source for all the site's JS
src/style.css           source mirror of the CSS overrides appended into index.html
assets/app.js           minified build of src/app.js (esbuild), what the page actually loads
assets/*.pdf             resume, sample pentest report, technical appendix
sw.js                    service worker; cache name = the version number
manifest.webmanifest     PWA manifest
llms.txt                 a short machine-readable summary, for agentic/LLM crawlers
robots.txt, sitemap.xml  standard SEO files
404.html                 custom not-found page
security.txt, SECURITY.md  responsible-disclosure contact
```

### Building

```bash
npx esbuild@0.21.5 src/app.js --minify --target=es2018 --outfile=assets/app.js
```

Then bump the version number in two places — the `?v=` query string on the `assets/app.js` script tag in `index.html`, and `var V = '...'` in `sw.js` — so the service worker picks up the new build. The cache name in `sw.js` is that same version number.

### `assets/vendor/three.min.js`

This is a **custom tree-shaken build**, not the stock Three.js download. The stock classic UMD build is 656KB (WebGLRenderer alone pulls in nearly the whole renderer regardless of which materials/geometries you use, so this is close to the practical floor) — tree-shaking it down to just the APIs the loading globe actually uses (`WebGLRenderer`, `Scene`, `PerspectiveCamera`, `Group`, `Mesh`, `TorusGeometry`, `MeshBasicMaterial`, `Points`, `PointsMaterial`, `LineSegments`, `LineBasicMaterial`, `BufferGeometry`, `BufferAttribute`) gets it to ~460KB (~120KB gzipped, vs ~167KB gzipped stock). To rebuild after bumping the Three.js version or using a new API:

```bash
mkdir /tmp/three-build && cd /tmp/three-build
npm init -y && npm install three@0.160.0
cat > entry.js <<'EOF'
import { WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, TorusGeometry,
  MeshBasicMaterial, Points, PointsMaterial, LineSegments, LineBasicMaterial,
  BufferGeometry, BufferAttribute } from 'three';
window.THREE = { WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, TorusGeometry,
  MeshBasicMaterial, Points, PointsMaterial, LineSegments, LineBasicMaterial,
  BufferGeometry, BufferAttribute };
EOF
npx esbuild entry.js --bundle --minify --format=iife --target=es2018 --outfile=three.custom.min.js
```

Also bump the `?v=` query string on its `<script>` tag in `index.html` and its entry in `sw.js`'s `CORE` list, same as `app.js`.

### No build step for HTML/CSS

`index.html` is edited directly; its inline `<style>` block is the source of truth, mirrored into `src/style.css` for readability. There's no CSS pipeline — new rules get appended before the closing `</style>` tag.

## Design notes

- **Theme:** `data-theme` on `<html>`, defaults to dark, remembered in `localStorage`. Both themes are tuned for WCAG AA contrast (4.5:1 text, 3:1 large text/UI).
- **Performance:** no frameworks, no web fonts beyond system fonts, a service worker cache, and a loading screen that only shows in full on a first visit (repeat visits are faster).
- **Security:** a strict CSP with script hashes (no `unsafe-inline`), no third-party trackers.
- **Accessibility:** semantic HTML, visible focus states, `prefers-reduced-motion` respected, alt text throughout.

## Hidden features

A few things aren't obvious from scrolling the page:

- **An in-browser terminal.** There's a working shell emulator (`cd`, `ls`, `cat`, `pwd`, `tree`, plus custom commands). Open it from the "Arch" / off-the-clock section, or just start typing when nothing else has focus. Type `help` inside it for the full command list — it includes a few things not shown anywhere on the page itself (`whoami`, `skills`, `certs`, `writeups`, `projects`, `education`, `theme`, `goto <section>`).
- **A tiny playable "room".** The Play section is a small TryHackMe-style challenge with three difficulty levels. Easy mode explains every step for someone who's never touched a terminal; the harder levels assume more.
- **An idle story on desktop.** Leave the mouse alone for a few seconds (desktop, fine pointer only) and a small ship wakes up, patrols the page, detects a threat, dogfights it, and — about a third of the time — both ships land on a card and transform into mechs for a longer duel, narrated with pentest-themed stage captions (Recon → Exploit → Escalate → Report). It only fights once per browser session; after that it's a quieter patrol. Debug it with `?idle=2000&win=4&debug=1` in the URL (`win` forces the round count 1–4, `debug=1` exposes `window.__st()` and `window.__adv(ms)` in the console for stepping through frame-by-frame).
- **Query-string test hooks:** `?idle=<ms>` sets the idle timeout before the story starts (default 3000ms), `?win=<1-4>` forces the fight outcome/round count, `?debug=1` exposes internal state for testing, `?nudgeidle=1` / `?nudgegap=1` tune notification timing for testing the popup placement logic.
- **Everything reacts to the cursor.** The custom cursor locks onto interactive elements, and notification popups grow outward from whichever element is "speaking" rather than sliding in from a screen edge.

## Related repos

- [reconkit](https://github.com/thecyberfarhan/reconkit) — recon automation tool
- [apicheck](https://github.com/thecyberfarhan/apicheck) — web/API misconfiguration checker
- [lab-reports](https://github.com/thecyberfarhan/lab-reports) — pentest-style writeups against lab targets
- [CTF-Writeups](https://github.com/thecyberfarhan/CTF-Writeups) — TryHackMe / Hack The Box writeups

## License

The site's code is free to read and learn from. Please don't republish it as your own portfolio — the content (certifications, writeups, resume) is specific to me.
