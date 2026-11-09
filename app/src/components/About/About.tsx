import { useRef } from 'react';
import Section from '../Section/Section';
import { useReveal } from '../../lib/useReveal';
import styles from './About.module.css';

const METHOD = [
  { n: '01', title: 'Scope', body: 'Agree what is in bounds, the rules and the stop conditions.' },
  { n: '02', title: 'Recon', body: 'Map the surface: ports, services and hidden content.' },
  { n: '03', title: 'Exploit', body: 'Prove the weakness with the smallest safe step.' },
  { n: '04', title: 'Escalate', body: 'Show how far it goes: privileges, pivoting, data reach.' },
  { n: '05', title: 'Report', body: 'Clear findings, evidence, a risk rating and the fix.' },
  { n: '06', title: 'Retest', body: 'Check the fix holds and close the finding.' },
];

export default function About() {
  const rootRef = useRef<HTMLElement>(null);
  useReveal(rootRef);

  return (
    <Section ref={rootRef} id="about" wash="lav" eyebrow="About" title="How I work">
      <div className={styles.grid}>
        <div>
          <p className={styles.statement} data-reveal>
            I find <em>real vulnerabilities</em> in web apps and APIs, prove them with the smallest
            safe step, and explain them so the people who fix them can act.
          </p>
          <dl className={styles.dl} data-reveal-group>
            <div data-reveal>
              <dt>How I work</dt>
              <dd>Hands-on labs, public writeups and a method I can explain step by step.</dd>
            </div>
            <div data-reveal>
              <dt>What I build</dt>
              <dd>Python tooling that automates recon and removes repetitive work.</dd>
            </div>
            <div data-reveal>
              <dt>Learning next</dt>
              <dd>Deeper web and API testing (auth and access-control flaws), Active Directory labs, and my first real projects.</dd>
            </div>
          </dl>
          <div className={styles.links} data-reveal>
            <a href="/assets/Sample_Pentest_Report.pdf" target="_blank" rel="noopener" data-cursor="Open">Read a sample report</a>
            <a href="/assets/Sample_Technical_Appendix.pdf" target="_blank" rel="noopener" data-cursor="Open">Technical appendix</a>
          </div>
        </div>
        <div>
          <span className="sr-only">How I test</span>
          <div className={styles.steps} data-reveal-group>
            {METHOD.map((s) => (
              <div key={s.n} className={styles.step} data-reveal>
                <div className={styles.stepNum}>{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
