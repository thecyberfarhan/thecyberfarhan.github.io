import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { dur, stagger } from '../../lib/motion';
import styles from './Hero.module.css';

interface HeroProps {
  ready: boolean;
}

export default function Hero({ ready }: HeroProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const played = useRef(false);

  useEffect(() => {
    if (!ready || played.current || !rootRef.current) return;
    played.current = true;

    const els = rootRef.current.querySelectorAll<HTMLElement>('[data-reveal]');
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.set(els, { yPercent: 110, autoAlpha: 0 });
    tl.to(els, {
      yPercent: 0,
      autoAlpha: 1,
      duration: dur(.9),
      stagger: stagger(.09),
    });

    const portrait = rootRef.current.querySelector<HTMLElement>('[data-portrait]');
    if (portrait) {
      gsap.fromTo(portrait, { autoAlpha: 0, scale: 1.06 },
        { autoAlpha: 1, scale: 1, duration: dur(1.1), ease: 'power3.out', delay: dur(.15) });
    }
  }, [ready]);

  return (
    <section ref={rootRef} className={styles.hero} id="hero">
      <div className={styles.dots} />
      <div className={styles.topRow}>
        <span data-reveal>Portfolio, 2026</span>
        <span className={styles.openTag} data-reveal><i />Open to work</span>
      </div>
      <div className={styles.nameStage}>
        <div className={styles.portrait} data-portrait>
          <img
            className={styles.portraitImg}
            src="/assets/portrait-bw.webp"
            srcSet="/assets/portrait-bw-700.webp 700w, /assets/portrait-bw.webp 1200w"
            sizes="(max-width: 880px) 72vw, 42vw"
            alt="Farhan Hussain"
            fetchPriority="high"
          />
          <div className={styles.portraitGrid} />
        </div>
        <div className={styles.bridgeLines} aria-hidden="true">
          <svg viewBox="0 0 800 800" preserveAspectRatio="none">
            <path d="M230,70 L470,70 L510,110 L800,110" stroke="var(--steel)" strokeWidth="1" fill="none" opacity=".4" strokeDasharray="5 9" />
            <path d="M800,540 L580,540 L540,580 L280,580" stroke="var(--accent)" strokeWidth="1" fill="none" opacity=".4" strokeDasharray="5 9" />
            <circle cx="510" cy="110" r="3" fill="var(--steel)" />
            <circle cx="280" cy="580" r="3" fill="var(--accent)" />
          </svg>
        </div>
        <h1 className={styles.name}>
          <span className={styles.line1} data-reveal>Farhan</span>
          <span className={styles.line2} data-reveal>Hussain</span>
        </h1>
      </div>

      <div className={styles.details}>
        <span className={styles.prompt} data-reveal>$ whoami</span>
        <p className={styles.lead} data-reveal>
          Web and API penetration tester. I break things in labs, write down how, and build
          Python tooling to speed up the boring parts.
        </p>
        <div className={styles.pills} data-reveal>
          <span className={styles.pill}>CPENT certified</span>
          <span className={styles.pill}>TryHackMe Top 3%</span>
          <span className={styles.pill}>100+ rooms</span>
          <span className={styles.pill}>37 writeups</span>
        </div>
        <div className={styles.ctas} data-reveal>
          <a href="#proof" className={`${styles.btn} ${styles.btnPrimary}`} data-magnet data-cursor="View">
            View my work
          </a>
          <a href="/assets/Farhan_Hussain_Resume_2026-11-04.pdf" className={styles.btn} data-magnet data-cursor="Download">
            Resume
          </a>
          <a href="https://github.com/thecyberfarhan" target="_blank" rel="noopener" className={styles.btn} data-magnet data-cursor="Open">
            GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
