import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useSiteStore } from '../../state/useSiteStore';
import { SECTION_LINES, GENERAL_LINES } from './lines';
import styles from './Nudges.module.css';

const SECTION_IDS = ['hero', 'proof', 'about', 'tools', 'projects', 'journey', 'play', 'arch', 'contact'];
const FIRST_DELAY = 45000;
const GAP_GROWTH = 1.6;
const MAX_GAP = 150000;

function currentSection(): string {
  const mid = innerHeight / 2;
  let best = 'hero', bestDist = Infinity;
  for (const id of SECTION_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.top <= mid && r.bottom >= mid) return id;
    const dist = Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
    if (dist < bestDist) { bestDist = dist; best = id; }
  }
  return best;
}

export default function Nudges() {
  const [text, setText] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const motionLevel = useSiteStore((s) => s.motionLevel);
  const lastLine = useRef<string | null>(null);

  useEffect(() => {
    if (motionLevel === 0) return;

    let lastActivity = Date.now();
    let gap = FIRST_DELAY;
    let shownAt = 0;
    let timer: number;

    function bump() { lastActivity = Date.now(); }
    window.addEventListener('pointermove', bump, { passive: true });
    window.addEventListener('scroll', bump, { passive: true });
    window.addEventListener('keydown', bump);
    window.addEventListener('touchstart', bump, { passive: true });

    function tick() {
      const now = Date.now();
      const idleFor = now - lastActivity;
      const sinceShown = now - shownAt;
      if (idleFor > FIRST_DELAY && sinceShown > gap && !document.hidden) {
        const section = currentSection();
        const pool = [...(SECTION_LINES[section] ?? []), ...GENERAL_LINES];
        let line = pool[Math.floor(Math.random() * pool.length)];
        if (line === lastLine.current && pool.length > 1) {
          line = pool[(pool.indexOf(line) + 1) % pool.length];
        }
        lastLine.current = line;
        setText(line);
        shownAt = now;
        gap = Math.min(gap * GAP_GROWTH, MAX_GAP);
        setTimeout(() => setText(null), 6000);
      }
      timer = window.setTimeout(tick, 2000);
    }
    timer = window.setTimeout(tick, 2000);

    return () => {
      window.removeEventListener('pointermove', bump);
      window.removeEventListener('scroll', bump);
      window.removeEventListener('keydown', bump);
      window.removeEventListener('touchstart', bump);
      clearTimeout(timer);
    };
  }, [motionLevel]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    if (text) {
      gsap.fromTo(el, { autoAlpha: 0, y: 12, scale: .96 }, { autoAlpha: 1, y: 0, scale: 1, duration: .4, ease: 'power3.out' });
    } else {
      gsap.to(el, { autoAlpha: 0, y: 8, duration: .3, ease: 'power2.in' });
    }
  }, [text]);

  if (motionLevel === 0) return null;

  return (
    <div ref={boxRef} className={styles.nudge} style={{ opacity: 0, visibility: text ? 'visible' : 'hidden' }} aria-live="polite">
      {text}
    </div>
  );
}
