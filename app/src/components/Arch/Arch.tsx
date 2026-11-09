import { useEffect, useRef, useState } from 'react';
import Section from '../Section/Section';
import { useReveal } from '../../lib/useReveal';
import styles from './Arch.module.css';

const ASCII = `      /\\\n     /  \\\n    /\\   \\\n   /      \\\n  /   ,,   \\\n /   |  |  -\\\n/_-''    ''-_\\`;

const FIELDS: [string, string][] = [
  ['OS', 'Arch Linux x86_64'],
  ['Kernel', 'Linux rolling'],
  ['Shell', 'zsh'],
  ['Role', 'Penetration Tester'],
  ['Editor', 'VS Code'],
  ['Packages', 'pacman'],
  ['Motto', 'btw'],
];

const STEPS = [
  { pkg: 'linux-hardened', pct: 18 },
  { pkg: 'python-pip', pct: 34 },
  { pkg: 'nmap', pct: 49 },
  { pkg: 'wireshark-cli', pct: 61 },
  { pkg: 'burpsuite', pct: 76 },
  { pkg: 'farhan', pct: 100 },
];

const CARDS = [
  { title: 'Simplicity', body: 'Nothing hidden. You see every part of the system, the same way you read a target.' },
  { title: 'Control', body: 'You build it from nothing, so you know what runs and why. Good habit for enumeration.' },
  { title: 'Minimal', body: 'No bloat, only what you choose to install. Fewer surprises, smaller attack surface.' },
  { title: 'Read the wiki', body: 'Break it, read the docs, fix it, repeat. It is the same loop as every lab I write up.' },
];

function useUptime() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setSecs(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function InstallLog() {
  const [lines, setLines] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const played = useRef(false);

  function play() {
    if (running) return;
    setRunning(true);
    setLines([':: Synchronizing package databases...']);
    STEPS.forEach((step, i) => {
      setTimeout(() => {
        setLines((prev) => [...prev, `installing ${step.pkg}  [${'#'.repeat(step.pct / 5).padEnd(20, '-')}] ${step.pct}%`]);
        if (i === STEPS.length - 1) {
          setTimeout(() => {
            setLines((prev) => [...prev, 'done. Next step: say hi.']);
            setRunning(false);
          }, 400);
        }
      }, 500 + i * 480);
    });
  }

  useEffect(() => {
    const el = boxRef.current;
    if (!el || played.current) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !played.current) {
        played.current = true;
        play();
        io.disconnect();
      }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.panel} data-reveal>
      <div className={styles.bar}><i /><i /><i /><span>sudo pacman -S farhan</span></div>
      <div ref={boxRef} className={styles.installLog}>
        {lines.map((l, i) => (
          <div key={i} className={i === lines.length - 1 && l.startsWith('done') ? styles.ok : l.includes('[') ? styles.bar2 : undefined}>{l}</div>
        ))}
      </div>
      <button type="button" className={styles.replay} onClick={play} disabled={running} data-cursor="Replay">
        {running ? 'Installing…' : 'Replay'}
      </button>
    </div>
  );
}

export default function Arch() {
  const rootRef = useRef<HTMLElement>(null);
  useReveal(rootRef);
  const uptime = useUptime();

  return (
    <Section ref={rootRef} id="arch" wash="bronze" index="07 / Off the clock" eyebrow="Off the clock" title="I use Arch, btw" sub="A tribute to everyone who read the wiki, broke the system, fixed it and told the whole room about it.">
      <div className={styles.grid}>
        <div className={styles.panel} data-reveal>
          <div className={styles.bar}><i /><i /><i /><span>farhan@arch</span></div>
          <div className={styles.neofetch}>
            <pre className={styles.ascii}>{ASCII}</pre>
            <div className={styles.fields}>
              <div className={styles.host}>farhan@arch</div>
              {FIELDS.map(([k, v]) => <div key={k}><b>{k}</b> {v}</div>)}
              <div><b>Uptime</b> {uptime}</div>
            </div>
          </div>
        </div>
        <InstallLog />
      </div>

      <div className={styles.cards} data-reveal-group>
        {CARDS.map((c) => (
          <div key={c.title} className={styles.card} data-reveal>
            <h3>{c.title}</h3>
            <p>{c.body}</p>
          </div>
        ))}
      </div>

      <p className={styles.quote} data-reveal>
        To every Arch user out there: we know, we mention it, and we would not have it any other way. Respect.
      </p>
    </Section>
  );
}
