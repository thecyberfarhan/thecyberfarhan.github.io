import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** Wires Lenis smooth scroll into GSAP's ScrollTrigger so pinned/scrubbed
 * animations stay in sync with the eased scroll position instead of the raw
 * native scrollTop. Mounted once at the app root. */
export function useSmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({ autoRaf: false });
    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(ScrollTrigger.update);
    };
  }, []);
}
