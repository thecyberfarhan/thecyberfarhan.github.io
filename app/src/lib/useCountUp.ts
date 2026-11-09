import { useEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { dur } from './motion';

gsap.registerPlugin(ScrollTrigger);

/** Animates a number from 0 to `end` once the element scrolls into view. */
export function useCountUp(ref: RefObject<HTMLElement | null>, end: number, opts?: { prefix?: string; suffix?: string }) {
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prefix = opts?.prefix ?? '';
    const suffix = opts?.suffix ?? '';
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        if (done.current) return;
        done.current = true;
        const counter = { v: 0 };
        gsap.to(counter, {
          v: end,
          duration: dur(1.1),
          ease: 'power3.out',
          onUpdate: () => { el.textContent = prefix + Math.round(counter.v) + suffix; },
        });
      },
    });
    return () => st.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [end]);
}
