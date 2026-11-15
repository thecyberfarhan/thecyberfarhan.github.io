// Smooth scrolling for the wheel and for in-page links (nav, "See how I work", skip links).
// Lenis drives the real window scroll, so every scroll animation keeps working unchanged.
import Lenis from 'lenis';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const NAV_OFFSET = -72;

export const lenis = reduced ? null : new Lenis({ autoRaf: true, lerp: 0.11, allowNestedScroll: true });

// page position from layout, so a heading still mid-reveal (shifted by a transform) doesn't skew the target
function docTop(n: HTMLElement | null) {
  let y = 0;
  for (; n; n = n.offsetParent as HTMLElement | null) y += n.offsetTop;
  return y;
}

function jump(hash: string) {
  let id = '';
  try { id = decodeURIComponent(hash.slice(1)); } catch { return false; } // a malformed hash is just ignored
  const el = id ? document.getElementById(id) : null;
  if (!el) return false;
  // a padded section lands with its heading just under the nav, not its empty padding
  const head = el.matches('.block, .contact') ? el.querySelector<HTMLElement>('.sec-head, .wrap > *') : null;
  const nav = document.getElementById('nav')?.offsetHeight ?? -NAV_OFFSET;
  const y = head ? docTop(head) - nav - 28 : docTop(el) + NAV_OFFSET;
  if (lenis) lenis.scrollTo(Math.max(0, y), { duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 3) });
  else scrollTo({ top: Math.max(0, y) });
  history.pushState(null, '', hash);
  return true;
}

// any link to a section of the page you are already on scrolls smoothly instead of jumping
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = (e.target as Element).closest?.('a[href*="#"]') as HTMLAnchorElement | null;
  if (!a || a.target === '_blank') return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || url.pathname.replace(/index\.html$/, '') !== location.pathname.replace(/index\.html$/, '')) return;
  if (jump(url.hash)) e.preventDefault();
});

// arriving from another page with a hash (e.g. /#contact from a writeup): glide there after load
if (location.hash && lenis) {
  addEventListener('load', () => setTimeout(() => jump(location.hash), 120), { once: true });
}

(window as unknown as { __lenis: Lenis | null }).__lenis = lenis;
