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
      gsap.fromTo(portrait, { autoAlpha: 0, scale: 1.08 },
        { autoAlpha: 1, scale: 1, duration: dur(1.1), ease: 'power3.out', delay: dur(.2) });
    }
  }, [ready]);

  return (
    <section ref={rootRef} className={styles.hero} id="hero">
      <div className={styles.copy}>
        <span className={styles.prompt} data-reveal>$ whoami</span>
        <h1 className={styles.name} data-reveal>Farhan</h1>
        <p className={styles.role} data-reveal>Web and API penetration tester</p>
        <p className={styles.lead} data-reveal>
          I break things in labs, write down how, and build Python tooling to speed up the boring parts.
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
      <div className={styles.portraitWrap} data-portrait>
        <img
          className={styles.portraitImg}
          src="/assets/portrait.webp"
          srcSet="/assets/portrait-700.webp 700w, /assets/portrait.webp 1200w"
          sizes="(max-width: 880px) 320px, 540px"
          alt="Farhan Hussain, stylized dark portrait"
          fetchPriority="high"
        />
        <div className={styles.portraitRing} />
      </div>
    </section>
  );
}
