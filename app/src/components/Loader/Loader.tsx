import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import styles from './Loader.module.css';

const KEYWORDS = [
  'PENETRATION TESTER',
  'RED TEAM',
  'CPENT CERTIFIED',
  'WEB & API SECURITY',
  'OSINT',
  'EXPLOIT DEVELOPMENT',
  'REPORTING',
  'TRYHACKME TOP 3%',
];

const STATUS_STEPS = ['scanning network', 'mapping nodes', 'locking on', 'ready'];

function Line({ speed, reverse }: { speed: number; reverse?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const words = KEYWORDS.join('  •  ') + '  •  ';

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const tween = gsap.fromTo(
      el,
      { xPercent: reverse ? -50 : 0 },
      { xPercent: reverse ? 0 : -50, duration: speed, ease: 'none', repeat: -1 },
    );
    return () => { tween.kill(); };
  }, [speed, reverse]);

  return (
    <div className={styles.line}>
      <div ref={ref} className={styles.lineInner}>
        <span>{words}</span>
        <span>{words}</span>
      </div>
    </div>
  );
}

interface LoaderProps {
  portraitSrc: string;
  onDone: () => void;
}

export default function Loader({ portraitSrc, onDone }: LoaderProps) {
  const [percent, setPercent] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const curtainRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const doneCalled = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const t0 = performance.now();
    const MIN_MS = 1400;

    const fontsReady = (document.fonts?.ready ?? Promise.resolve()).then(() => 0.4);
    const imageReady = new Promise<number>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(0.4);
      img.onerror = () => resolve(0.4);
      img.src = portraitSrc;
    });

    let raf = 0;
    function tick() {
      if (cancelled) return;
      const elapsed = performance.now() - t0;
      const timeFraction = Math.min(elapsed / MIN_MS, 1) * 0.2;
      setPercent((p) => Math.min(99, Math.max(p, Math.round((timeFraction) * 100))));
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    Promise.all([fontsReady, imageReady]).then(([a, b]) => {
      if (cancelled) return;
      const minElapsed = new Promise<void>((resolve) => {
        const remaining = MIN_MS - (performance.now() - t0);
        setTimeout(resolve, Math.max(0, remaining));
      });
      minElapsed.then(() => {
        if (cancelled) return;
        cancelAnimationFrame(raf);
        setPercent(100);
        setStatusIdx(STATUS_STEPS.length - 1);
        void (a + b);
      });
    });

    const statusTimer = setInterval(() => {
      setStatusIdx((i) => Math.min(i + 1, STATUS_STEPS.length - 2));
    }, 420);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearInterval(statusTimer);
    };
  }, [portraitSrc]);

  useEffect(() => {
    if (barRef.current) gsap.to(barRef.current, { width: `${percent}%`, duration: .3, ease: 'power2.out' });
  }, [percent]);

  useEffect(() => {
    if (percent < 100 || doneCalled.current) return;
    doneCalled.current = true;
    const tl = gsap.timeline({ onComplete: onDone });
    tl.to(rootRef.current, { autoAlpha: 0, duration: .35, ease: 'power2.inOut' }, 0.15);
    if (curtainRef.current) {
      tl.set(curtainRef.current, { autoAlpha: 1 }, 0);
      tl.to(curtainRef.current, { yPercent: -100, duration: .7, ease: 'power3.inOut' }, 0.2);
    }
  }, [percent, onDone]);

  return (
    <>
      <div ref={rootRef} className={styles.loader}>
        <div className={styles.topRow}>
          <span>FARHAN HUSSAIN</span>
          <span>PORTFOLIO, 2026</span>
        </div>
        <div className={styles.marquee}>
          <Line speed={22} />
          <Line speed={28} reverse />
          <Line speed={18} />
          <Line speed={34} reverse />
        </div>
        <div className={styles.bottomRow}>
          <span className={styles.status}>
            <span className={styles.statusDot} />
            {STATUS_STEPS[statusIdx]}
          </span>
          <span className={styles.percent}>{percent}<span>%</span></span>
        </div>
        <div className={styles.bar}><div ref={barRef} className={styles.barFill} /></div>
      </div>
      <div ref={curtainRef} className={styles.curtain} style={{ opacity: 0, visibility: 'hidden' }} />
    </>
  );
}
