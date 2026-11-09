import { useRef } from 'react';
import Section from '../Section/Section';
import { useReveal } from '../../lib/useReveal';
import styles from './Contact.module.css';

const PREFS = [
  ['Availability', 'Full-time, immediately'],
  ['Location', 'Remote or on-site in Pakistan, open to relocation'],
  ['Languages', 'English (advanced), Urdu (fluent)'],
  ['Interested in', 'Pakistan-based security teams'],
];

const LINKS = [
  { name: 'LinkedIn', handle: 'in/cyber-farhan-hussain', href: 'https://www.linkedin.com/in/cyber-farhan-hussain/' },
  { name: 'GitHub', handle: '@thecyberfarhan', href: 'https://github.com/thecyberfarhan' },
  { name: 'TryHackMe', handle: 'farhan.hussain', href: 'https://tryhackme.com/p/farhan.hussain' },
  { name: 'Writeups', handle: 'CTF-Writeups, 37 and counting', href: 'https://github.com/thecyberfarhan/CTF-Writeups' },
  { name: 'Resume', handle: 'PDF, one page', href: '/assets/Farhan_Hussain_Resume_2026-11-04.pdf' },
];

export default function Contact() {
  const rootRef = useRef<HTMLElement>(null);
  useReveal(rootRef);

  return (
    <Section ref={rootRef} id="contact" wash="steel" index="06 / Contact" eyebrow="Let's talk" title="Get in touch">
      <p className={styles.statement} data-reveal>
        Open to junior penetration testing roles. Web and API security is where I am strongest.
      </p>
      <a href="mailto:farhan736hussain@gmail.com" className={styles.emailLink} data-reveal data-magnet data-cursor="Email">
        farhan736hussain@gmail.com
      </a>
      <dl className={styles.prefs} data-reveal-group>
        {PREFS.map(([k, v]) => (
          <div key={k} data-reveal><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
      <div className={styles.links} data-reveal-group>
        {LINKS.map((l) => (
          <a key={l.name} href={l.href} target="_blank" rel="noopener" className={styles.linkRow} data-reveal data-cursor="Open">
            <div className={styles.linkInfo}>
              <span className={styles.linkName}>{l.name}</span>
              <span className={styles.linkHandle}>{l.handle}</span>
            </div>
            <svg className={styles.arrow} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </a>
        ))}
      </div>
    </Section>
  );
}
