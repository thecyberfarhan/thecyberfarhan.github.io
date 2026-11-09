import { useRef } from 'react';
import Section from '../Section/Section';
import { useReveal } from '../../lib/useReveal';
import styles from './Journey.module.css';

const NODES = [
  { year: '2023 – 2025', title: 'Intermediate, ICS', body: 'Al-Hayat College, 87%. Started learning security on the side.' },
  { year: 'Practice', title: 'Labs and platforms', body: 'TryHackMe, Hack The Box, PicoCTF, PortSwigger and Hacker101.' },
  { year: 'Writing it down', title: 'Public writeups', body: 'Every lab becomes a short report with a key takeaway.' },
  { year: 'Tooling', title: 'Python and Bash', body: 'A virtual-environment manager and personal automation scripts.' },
  { year: '2026', title: 'CPENT certified', body: 'EC-Council Certified Penetration Testing Professional.' },
  { year: 'Now', title: 'Open to work', body: 'Junior penetration tester roles, with a web and API focus.', now: true },
];

export default function Journey() {
  const rootRef = useRef<HTMLElement>(null);
  useReveal(rootRef);

  return (
    <Section
      ref={rootRef}
      id="journey"
      wash="lav"
      index="05 / Journey"
      eyebrow="Journey"
      title="How I got here"
      sub="Scroll sideways. Six stops from first lab to open to work."
    >
      <div className={styles.rail} data-reveal-group>
        {NODES.map((n) => (
          <div key={n.title} className={`${styles.node} ${n.now ? styles.now : ''}`} data-reveal>
            <span className={styles.dot} />
            <span className={styles.year}>{n.year}</span>
            <h3>{n.title}</h3>
            <p>{n.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
