import { useRef, useState } from 'react';
import gsap from 'gsap';
import Section from '../Section/Section';
import { useReveal } from '../../lib/useReveal';
import { dur } from '../../lib/motion';
import styles from './Projects.module.css';

type Cat = 'all' | 'orig' | 'fork' | 'notes';

const FILTERS: { key: Cat; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'orig', label: 'Built, Not Borrowed' },
  { key: 'fork', label: 'Forked & Fixed' },
  { key: 'notes', label: 'Field Notes' },
];

const PROJECTS = [
  { cat: 'orig', tag: 'Original', status: 'Active', title: 'ReconKit', href: 'https://github.com/thecyberfarhan/reconkit', desc: 'Recon automation: threaded port scan, HTTP/security-header probing and subdomain brute force, with a built-in scope guard. Stdlib only, with tests.', badges: ['Python', 'Stdlib', 'Tests'] },
  { cat: 'orig', tag: 'Original', status: 'Active', title: 'APICheck', href: 'https://github.com/thecyberfarhan/apicheck', desc: 'Web and API misconfiguration checker: headers, cookies, CORS, leftover sensitive files, directory listing, verbose errors, auth comparison.', badges: ['Python', 'Stdlib', 'Tests'] },
  { cat: 'orig', tag: 'Original', status: 'Private', title: 'Virtual-Env Manager', href: 'https://github.com/thecyberfarhan', desc: 'A Python virtual-environment manager built for my own workflow, ~1,800 lines, with Rich and InquirerPy.', badges: ['Python', 'Rich', 'InquirerPy'] },
  { cat: 'notes', tag: 'Field note', status: 'Written', title: 'Lab Reports', href: 'https://github.com/thecyberfarhan/lab-reports', desc: 'Pentest-style report on DVWA (low security): SQL injection, OS command injection and reflected XSS, each with evidence, risk rating and a fix.', badges: ['Markdown', 'DVWA'] },
  { cat: 'fork', tag: 'Fork', status: '', title: 'Sherlock', href: 'https://github.com/thecyberfarhan/sherlock', desc: 'Fork of a 50k-star username OSINT tool: canary-based confidence verification, auto-retry on transient errors, Markdown export. Two fixes went back upstream as a real PR.', badges: ['Python', 'PR Open'] },
  { cat: 'fork', tag: 'Fork', status: '', title: 'King Phisher', href: 'https://github.com/thecyberfarhan/king-phisher', desc: 'Fork of a phishing-campaign toolkit: fixed a real Python 3.12+ crash and a SQLAlchemy break the (unmaintained) upstream never got, modernized the dependency set, automated the dev venv.', badges: ['Python', 'asyncio'] },
];

export default function Projects() {
  const rootRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<Cat>('all');
  useReveal(rootRef);

  function applyFilter(next: Cat) {
    if (next === filter) return;
    const cards = gridRef.current?.querySelectorAll<HTMLElement>('[data-card]');
    if (cards?.length) {
      gsap.to(cards, { autoAlpha: 0, y: 8, duration: dur(.18), onComplete: () => setFilter(next) });
    } else {
      setFilter(next);
    }
  }

  const visible = PROJECTS.filter((p) => filter === 'all' || p.cat === filter);

  return (
    <Section
      ref={rootRef}
      id="projects"
      wash="accent"
      index="04 / Projects"
      eyebrow="Projects"
      title="Tools I built, reports I wrote"
      sub="Not just labs I completed. Source and tests on GitHub."
    >
      <div className={styles.tabs} data-reveal>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`${styles.tab} ${filter === f.key ? styles.on : ''}`}
            onClick={() => applyFilter(f.key)}
            data-cursor="Filter"
          >
            {f.label}
          </button>
        ))}
      </div>

      <div ref={gridRef} className={styles.grid} data-reveal-group>
        {visible.map((p) => (
          <a key={p.title} data-card href={p.href} target="_blank" rel="noopener" className={styles.card} data-reveal data-cursor="Open">
            <div className={styles.cardTop}>
              <span className={styles.cardTag}>{p.tag}</span>
              {p.status && <span className={styles.cardStatus}>{p.status}</span>}
            </div>
            <h3>{p.title}</h3>
            <p>{p.desc}</p>
            <div className={styles.badges}>
              {p.badges.map((b) => <span key={b} className={styles.badge}>{b}</span>)}
            </div>
          </a>
        ))}
      </div>
    </Section>
  );
}
