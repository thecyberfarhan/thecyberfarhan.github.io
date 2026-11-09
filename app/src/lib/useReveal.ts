import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { dur, stagger } from './motion';

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll-triggered reveal for every [data-reveal] element inside a section,
 * grouped by their nearest [data-reveal-group] ancestor (falls back to the
 * element itself) so related items (a card grid, a stat row) stagger together
 * instead of each firing its own independent trigger. Duration/stagger scale
 * with the motion dial via src/lib/motion.ts.
 */
export function useReveal(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const groups = new Map<Element, Element[]>();
      el.querySelectorAll<HTMLElement>('[data-reveal]').forEach((node) => {
        const group = node.closest('[data-reveal-group]') ?? node;
        const list = groups.get(group) ?? [];
        list.push(node);
        groups.set(group, list);
      });

      groups.forEach((nodes, group) => {
        gsap.set(nodes, { yPercent: 30, autoAlpha: 0 });
        gsap.to(nodes, {
          yPercent: 0,
          autoAlpha: 1,
          duration: dur(.8),
          stagger: stagger(.08),
          ease: 'power3.out',
          scrollTrigger: {
            trigger: group as Element,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });
      });
    }, el);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
