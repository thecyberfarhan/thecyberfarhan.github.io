import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import styles from './Cursor.module.css';

/**
 * Custom magnetic cursor: a dot that tracks the pointer exactly, and a ring that
 * trails with a quickTo spring and expands + shows a contextual label over anything
 * tagged [data-cursor]. Mouse-only — touch/coarse pointers never mount this.
 */
export default function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [label, setLabel] = useState('');

  useEffect(() => {
    const isFine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!isFine) return;
    document.documentElement.classList.add('has-cursor');

    const dot = dotRef.current!;
    const ring = ringRef.current!;
    const setDot = { x: gsap.quickSetter(dot, 'x', 'px'), y: gsap.quickSetter(dot, 'y', 'px') };
    const quickRingX = gsap.quickTo(ring, 'x', { duration: .45, ease: 'power3.out' });
    const quickRingY = gsap.quickTo(ring, 'y', { duration: .45, ease: 'power3.out' });

    let magnetEl: HTMLElement | null = null;

    function onMove(e: PointerEvent) {
      setDot.x(e.clientX);
      setDot.y(e.clientY);
      if (magnetEl) {
        const r = magnetEl.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        quickRingX((cx + (e.clientX - cx) * 0.3));
        quickRingY((cy + (e.clientY - cy) * 0.3));
      } else {
        quickRingX(e.clientX);
        quickRingY(e.clientY);
      }
    }

    function onOver(e: PointerEvent) {
      const target = (e.target as HTMLElement)?.closest<HTMLElement>('[data-cursor], a, button');
      if (!target) { setActive(false); magnetEl = null; return; }
      magnetEl = target.hasAttribute('data-magnet') ? target : null;
      setActive(true);
      setLabel(target.getAttribute('data-cursor') || '');
    }
    function onOut(e: PointerEvent) {
      const related = e.relatedTarget as HTMLElement | null;
      if (related?.closest('[data-cursor], a, button')) return;
      setActive(false);
      magnetEl = null;
    }

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerover', onOver, { passive: true });
    window.addEventListener('pointerout', onOut, { passive: true });
    return () => {
      document.documentElement.classList.remove('has-cursor');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', onOver);
      window.removeEventListener('pointerout', onOut);
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className={styles.dot} />
      <div ref={ringRef} className={`${styles.ring} ${active ? styles.active : ''}`}
        style={{ width: active ? 64 : 36, height: active ? 64 : 36, marginLeft: active ? -32 : -18, marginTop: active ? -32 : -18 }}>
        <span className={styles.label}>{label}</span>
      </div>
    </>
  );
}
