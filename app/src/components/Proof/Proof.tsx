import { useRef } from 'react';
import Section from '../Section/Section';
import { useReveal } from '../../lib/useReveal';
import { useCountUp } from '../../lib/useCountUp';
import styles from './Proof.module.css';

const WRITEUPS = [
  { platform: 'TryHackMe', title: 'Mr Robot CTF', diff: 'medium', note: 'Always deduplicate custom wordlists before feeding them to Hydra — 858,160 entries shrunk to 11,451 is a 75× speed improvement for zero information loss.', href: 'https://github.com/thecyberfarhan/CTF-Writeups/blob/main/TryHackme/mrrobot_writeup.md' },
  { platform: 'TryHackMe', title: 'Mustacchio', diff: 'easy', note: 'XXE is not just an academic vulnerability — when a web application parses XML and reflects the output, a single malicious DOCTYPE declaration can turn the XML…', href: 'https://github.com/thecyberfarhan/CTF-Writeups/blob/main/TryHackme/mustacchio_writeup.md' },
  { platform: 'Hack The Box', title: 'Archetype', diff: 'veryEasy', note: 'ConsoleHost_history.txt is the Windows equivalent of .bash_history — and people are far less likely to think about clearing it.', href: 'https://github.com/thecyberfarhan/CTF-Writeups/blob/main/HackTheBox/archetype_writeup.md' },
  { platform: 'Hack The Box', title: 'Cap', diff: 'easy', note: 'Linux capabilities are quieter than SUID bits and just as dangerous.', href: 'https://github.com/thecyberfarhan/CTF-Writeups/blob/main/HackTheBox/cap_writeup.md' },
  { platform: 'TryHackMe', title: 'Overpass', diff: 'easy', note: 'Broken authentication doesn’t need to be subtle to be devastating — here it was "the server trusts a cookie it never issued." Read client-side JavaScript…', href: 'https://github.com/thecyberfarhan/CTF-Writeups/blob/main/TryHackme/overpass_writeup.md' },
  { platform: 'TryHackMe', title: 'Silver Platter', diff: 'medium', note: 'Passwords passed as command-line arguments are logged everywhere — sudo audit logs, shell history, ps output, and /proc.', href: 'https://github.com/thecyberfarhan/CTF-Writeups/blob/main/TryHackme/silverplatter_writeup.md' },
  { platform: 'TryHackMe', title: 'tomghost', diff: 'easy', note: 'Always check exposed protocols, not just the headline application version — Ghostcat is a connector-level vulnerability that exists independently of which…', href: 'https://github.com/thecyberfarhan/CTF-Writeups/blob/main/TryHackme/tomghost_writeup.md' },
];

const DIFF_LABEL: Record<string, string> = { easy: 'Easy', medium: 'Medium', veryEasy: 'Very Easy' };

function Stat({ end, label, prefix, suffix }: { end: number; label: string; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useCountUp(ref, end, { prefix, suffix });
  return (
    <div data-reveal>
      <div ref={ref} className={styles.statNum}>{prefix ?? ''}0{suffix ?? ''}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

export default function Proof() {
  const rootRef = useRef<HTMLElement>(null);
  useReveal(rootRef);

  return (
    <Section
      ref={rootRef}
      id="proof"
      wash="steel"
      index="01 / Proof"
      eyebrow="Proof of work"
      title="Public and checkable"
      sub="Certification, rankings and every writeup on GitHub."
    >
      <div className={styles.topRow} data-reveal-group>
        <div className={styles.stats}>
          <Stat end={3} prefix="Top " suffix="%" label="TryHackMe ranking" />
          <Stat end={100} suffix="+" label="Rooms completed" />
          <Stat end={37} label="Published writeups" />
        </div>
        <div className={styles.medal} data-reveal>
          <a href="https://aspen.eccouncil.org/verify" target="_blank" rel="noopener" className={styles.medalImgWrap} data-cursor="Verify">
            <img src="/assets/cpent-medal.webp" alt="EC-Council CPENT certification badge" />
          </a>
          <div className={styles.medalText}>
            <a href="https://aspen.eccouncil.org/verify" target="_blank" rel="noopener">Verify at EC-Council</a>
            <div className={styles.medalCert}>Cert <span>ECC9251076384</span></div>
          </div>
        </div>
      </div>

      <div className={styles.ledger} data-reveal-group>
        {WRITEUPS.map((w) => (
          <a key={w.title} href={w.href} target="_blank" rel="noopener" className={styles.row} data-reveal data-cursor="Read">
            <span className={styles.platform}>{w.platform}</span>
            <div className={styles.rowBody}>
              <h3>{w.title}</h3>
              <p>{w.note}</p>
            </div>
            <span className={`${styles.diff} ${styles[w.diff]}`}>{DIFF_LABEL[w.diff]}</span>
            <svg className={styles.arrow} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </a>
        ))}
      </div>

      <div className={styles.foot} data-reveal>
        <a href="https://tryhackme.com/p/farhan.hussain" target="_blank" rel="noopener" className={styles.thm} data-cursor="Open">
          <img src="/assets/avatar.jpg" alt="" />
          <div>
            <div className={styles.handle}>farhan.hussain</div>
            <div className={styles.url}>tryhackme.com/p/farhan.hussain</div>
          </div>
        </a>
        <a href="https://github.com/thecyberfarhan/CTF-Writeups" target="_blank" rel="noopener" className={styles.readAll} data-magnet data-cursor="Open">
          Read all writeups
        </a>
      </div>

      <div className={styles.ghActivity} data-reveal>
        <picture>
          <source media="(max-width: 700px)" srcSet="/assets/contributions-m.svg" />
          <img src="/assets/contributions.svg" alt="3D contribution skyline: 72 contributions in the last year" loading="lazy" />
        </picture>
      </div>
    </Section>
  );
}
