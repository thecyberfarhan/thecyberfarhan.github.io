import { useRef } from 'react';
import Section from '../Section/Section';
import { useReveal } from '../../lib/useReveal';
import styles from './Tools.module.css';

const CORE = [
  ['Kali', '--ic-kali'], ['Linux', '--ic-linux'], ['Windows', '--ic-windows'], ['Python', '--ic-python'],
  ['Bash', '--ic-bash'], ['PowerShell', '--ic-powershell'], ['JavaScript', '--ic-js'], ['SQL', '--ic-sql'],
  ['Docker', '--ic-docker'], ['GitHub', '--ic-github'],
] as const;

const COLUMNS = [
  {
    n: '01', title: 'Recon and scanning', c: 'var(--steel)',
    tools: [
      ['Nmap', 'Port and service scans'], ['Nessus', 'Vulnerability scanning'], ['Nikto', 'Web server scanning'],
      ['RustScan', 'Fast port discovery'], ['Masscan', 'Large-scale scanning'], ['Subfinder', 'Subdomain discovery'],
      ['Shodan', 'Internet-wide search'], ['Maltego', 'OSINT link analysis'],
    ],
  },
  {
    n: '02', title: 'Web and API', c: 'var(--bronze)',
    tools: [
      ['Burp Suite', 'Proxy and scanner'], ['OWASP ZAP', 'Proxy and scanner'], ['ffuf', 'Web fuzzing'],
      ['feroxbuster', 'Content discovery'], ['SQLMap', 'SQL injection'], ['Caido', 'Web proxy'],
      ['XSStrike', 'XSS detection'], ['WPScan', 'WordPress scanning'],
    ],
  },
  {
    n: '03', title: 'Exploitation and AD', c: 'var(--accent)',
    tools: [
      ['Metasploit', 'Exploitation framework'], ['Cobalt Strike', 'Red team C2'], ['Mythic', 'C2 framework'],
      ['BloodHound', 'AD attack paths'], ['Impacket', 'Windows protocols'], ['NetExec', 'SMB and AD testing'],
      ['Mimikatz', 'Credential extraction'], ['Evil-WinRM', 'WinRM shell'],
    ],
  },
  {
    n: '04', title: 'Passwords and network', c: 'var(--lav)',
    tools: [
      ['Hydra', 'Online brute force'], ['John the Ripper', 'Password cracking'], ['Hashcat', 'GPU hash cracking'],
      ['Wireshark', 'Packet analysis'], ['tcpdump', 'Packet capture'], ['Aircrack-ng', 'Wi-Fi auditing'],
      ['Bettercap', 'MITM framework'], ['Ligolo-ng', 'Tunneling and pivoting'],
    ],
  },
];

const TECHNIQUES = [
  'OWASP Top 10', 'SQL injection', 'XSS', 'Password spraying', 'Kerberoasting', 'AS-REP roasting',
  'Pass-the-Hash', 'DCSync', 'Golden and Silver tickets', 'AMSI bypass', 'Linux privilege escalation',
  'Windows privilege escalation', 'Pivoting and tunneling', 'Reverse shells', 'Lateral movement',
  'Active Directory enumeration',
];

export default function Tools() {
  const rootRef = useRef<HTMLElement>(null);
  useReveal(rootRef);

  return (
    <Section ref={rootRef} id="tools" wash="bronze" index="03 / Tools" eyebrow="Core stack" title="A test, phase by phase">
      <div className={styles.coreRow} data-reveal-group>
        {CORE.map(([name, token]) => (
          <span key={name} className={styles.chip} data-reveal>
            <span className={styles.dot} style={{ ['--c' as string]: `var(${token})` }} />
            {name}
          </span>
        ))}
      </div>

      <div className={styles.cols} data-reveal-group>
        {COLUMNS.map((col) => (
          <div key={col.n} className={styles.col} style={{ ['--c' as string]: col.c }} data-reveal>
            <div className={styles.colHead}>
              <span className={styles.colNum}>{col.n}</span>
              <span className={styles.colTitle}>{col.title}</span>
            </div>
            {col.tools.map(([name, desc]) => (
              <div key={name} className={styles.tool}>
                <b>{name}</b>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div data-reveal>
        <span className="sr-only">Techniques and frameworks</span>
        <div className={styles.tags}>
          {TECHNIQUES.map((t) => <span key={t} className={styles.tag}>{t}</span>)}
        </div>
      </div>
    </Section>
  );
}
