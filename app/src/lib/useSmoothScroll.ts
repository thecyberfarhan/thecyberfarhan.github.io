import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** Wires Lenis smooth scroll into GSAP's ScrollTrigger so pinned/scrubbed
 * animations stay in sync with the eased scroll position instead of the raw
 * native scrollTop. Mounted once at the app root.
 *
 * Also intercepts in-page anchor clicks (nav links, "View my work", etc.) and
 * routes them through lenis.scrollTo() instead of letting the browser jump
 * natively. A native jump sets scrollTop directly, which Lenis never sees —
 * so ScrollTrigger.update() never fires for it, and any section revealed via
 * scroll-into-view ends up stuck invisible forever. Routing through Lenis
 * keeps the eased scroll, the motion, and the reveal triggers all in sync.
 */
export function useSmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({ autoRaf: false });
    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    function onClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!anchor) return;
      const id = anchor.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -72 });
    }
    document.addEventListener('click', onClick);

    // A fresh load (or reload) at a URL that already has a #hash needs the same
    // treatment: let the page mount first, then let Lenis do the jump so
    // ScrollTrigger sees it, instead of leaving it to the browser's own
    // (unreliable, pre-mount) native anchor scroll.
    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target) {
        requestAnimationFrame(() => {
          lenis.scrollTo(target as HTMLElement, { offset: -72, immediate: true });
        });
      }
    }

    return () => {
      document.removeEventListener('click', onClick);
      lenis.destroy();
      gsap.ticker.remove(ScrollTrigger.update);
    };
  }, []);
}
