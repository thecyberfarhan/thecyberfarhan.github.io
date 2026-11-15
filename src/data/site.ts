import data from './writeups.json';

export const writeups = data.writeups;
export type Writeup = (typeof writeups)[number];

export const SITE = {
  url: 'https://thecyberfarhan.github.io',
  name: 'Farhan Hussain',
  role: 'Penetration tester',
  focus: 'Web & API',
  email: 'farhan736hussain@gmail.com',
  resume: '/assets/Farhan_Hussain_Resume_2026-11-04.pdf',
  report: '/assets/Sample_Pentest_Report.pdf',
  appendix: '/assets/Sample_Technical_Appendix.pdf',
  linkedin: 'https://www.linkedin.com/in/cyber-farhan-hussain/',
  github: 'https://github.com/thecyberfarhan',
  tryhackme: 'https://tryhackme.com/p/farhan.hussain',
  writeupsRepo: 'https://github.com/thecyberfarhan/CTF-Writeups',
  certId: 'ECC9251076384',
  certVerify: 'https://aspen.eccouncil.org/verify',
};

export const STATS = {
  thmRank: 3,
  rooms: 100,
  writeups: writeups.length,
};

// the six steps of a test, used by the scroll "engagement" and repeated nowhere else
export const METHOD = [
  { n: '01', name: 'Scope', title: 'Agree on the rules first', body: 'What is in bounds, what is not, when to stop and who to call. Nothing is touched before this is written down.' },
  { n: '02', name: 'Recon', title: 'Map what is exposed', body: 'Domains, open ports, forgotten pages and old services. Most findings start with something nobody remembered was public.' },
  { n: '03', name: 'Exploit', title: 'Prove the weakness, safely', body: 'A login form, an outdated plugin, an API that trusts too much. I prove it is real with the smallest safe step.' },
  { n: '04', name: 'Escalate', title: 'Show how far it goes', body: 'One foothold rarely stays small. I follow it to show the real impact: more privileges, other systems, sensitive data.' },
  { n: '05', name: 'Report', title: 'Explain it so it gets fixed', body: 'Every finding gets evidence, a risk rating and a clear fix, written so a manager can act on it, not just an engineer.' },
  { n: '06', name: 'Retest', title: 'Check the fix holds', body: 'After the fix ships, I test again and close the finding only when the way in is really gone.' },
];

export const ABOUT = {
  statement: 'I find real vulnerabilities in web apps and APIs, prove them with the smallest safe step, and explain them so the people who fix them can act.',
  columns: [
    { title: 'How I work', body: 'Hands-on labs, public writeups and a method I can explain step by step to a technical or non-technical audience.' },
    { title: 'What I build', body: 'Small Python tools that automate recon and take the repetitive parts out of testing and reporting.' },
    { title: 'Learning next', body: 'Deeper web and API testing (authentication and access-control flaws), Active Directory labs, and my first client projects.' },
  ],
};

export type Project = { kind: 'Original' | 'Fork' | 'Field note'; name: string; body: string; tags: string[]; status: string; href?: string };
export const PROJECTS: Project[] = [
  { kind: 'Original', name: 'ReconKit', body: 'Recon automation: threaded port scan, HTTP and security-header probing, subdomain brute force, with a built-in scope guard. Standard library only, with tests.', tags: ['Python', 'Stdlib', 'Tests'], status: 'Active', href: 'https://github.com/thecyberfarhan/reconkit' },
  { kind: 'Original', name: 'APICheck', body: 'Web and API misconfiguration checker: headers, cookies, CORS, leftover sensitive files, directory listing, verbose errors and auth comparison.', tags: ['Python', 'Stdlib', 'Tests'], status: 'Active', href: 'https://github.com/thecyberfarhan/apicheck' },
  { kind: 'Field note', name: 'Lab Reports', body: 'A pentest-style report on DVWA: SQL injection, OS command injection and reflected XSS, each with evidence, a risk rating and a fix.', tags: ['Markdown', 'DVWA'], status: 'Written', href: 'https://github.com/thecyberfarhan/lab-reports' },
  { kind: 'Fork', name: 'Sherlock', body: 'Fork of a 50k-star username OSINT tool: confidence checks, retries on transient errors and Markdown export. Two fixes went back upstream as a pull request.', tags: ['Python', 'Upstream PR'], status: 'Fork', href: 'https://github.com/thecyberfarhan/sherlock' },
  { kind: 'Fork', name: 'King Phisher', body: 'Fork of a phishing-campaign toolkit: fixed a Python 3.12+ crash and a SQLAlchemy break the unmaintained upstream never got, and modernised its dependencies.', tags: ['Python', 'asyncio'], status: 'Fork', href: 'https://github.com/thecyberfarhan/king-phisher' },
  { kind: 'Original', name: 'Virtual-Env Manager', body: 'A Python virtual-environment manager built for my own workflow, about 1,800 lines, with Rich and InquirerPy.', tags: ['Python', 'Rich'], status: 'Private' },
];

export const STACK = ['Kali', 'Linux', 'Windows', 'Python', 'Bash', 'PowerShell', 'JavaScript', 'SQL', 'Docker', 'GitHub'];

export const TOOL_PHASES = [
  { phase: 'Recon and scanning', tools: [['Nmap', 'Port and service scans'], ['Nessus', 'Vulnerability scanning'], ['Nikto', 'Web server scanning'], ['RustScan', 'Fast port discovery'], ['Masscan', 'Large-scale scanning'], ['Subfinder', 'Subdomain discovery'], ['Shodan', 'Internet-wide search'], ['Maltego', 'OSINT link analysis']] },
  { phase: 'Web and API', tools: [['Burp Suite', 'Proxy and scanner'], ['OWASP ZAP', 'Proxy and scanner'], ['FFUF', 'Web fuzzing'], ['Feroxbuster', 'Content discovery'], ['SQLMap', 'SQL injection'], ['Caido', 'Web proxy'], ['XSStrike', 'XSS detection'], ['WPScan', 'WordPress scanning']] },
  { phase: 'Exploitation and AD', tools: [['Metasploit', 'Exploitation framework'], ['Cobalt Strike', 'Red team C2'], ['Mythic', 'C2 framework'], ['BloodHound', 'AD attack paths'], ['Impacket', 'Windows protocols'], ['NetExec', 'SMB and AD testing'], ['Mimikatz', 'Credential extraction'], ['Evil-WinRM', 'WinRM shell']] },
  { phase: 'Passwords and network', tools: [['Hydra', 'Online brute force'], ['John the Ripper', 'Password cracking'], ['Hashcat', 'GPU hash cracking'], ['Wireshark', 'Packet analysis'], ['Tcpdump', 'Packet capture'], ['Aircrack-ng', 'Wi-Fi auditing'], ['Bettercap', 'MITM framework'], ['Ligolo-ng', 'Tunneling and pivoting']] },
] as const;

export const TECHNIQUES = ['OWASP Top 10', 'SQL injection', 'XSS', 'Password spraying', 'Kerberoasting', 'AS-REP roasting', 'Pass-the-Hash', 'DCSync', 'Golden and Silver tickets', 'AMSI bypass', 'Linux privilege escalation', 'Windows privilege escalation', 'Pivoting and tunneling', 'Reverse shells', 'Lateral movement', 'Active Directory enumeration'];

// the road so far: main stops on the spine, detours bulge off it and rejoin
export type Stop = { kind: 'main' | 'detour'; when: string; title: string; body: string; tags?: string[] };
export const JOURNEY: Stop[] = [
  { kind: 'main', when: '2023', title: 'Matric', body: 'Finished school and went straight into intermediate.' },
  { kind: 'main', when: '2023 – 2025', title: 'Intermediate, ICS', body: 'Al-Hayat College, finished with 87%. Alongside classes I kept teaching myself other skills, to see which one would stick.' },
  { kind: 'detour', when: 'Alongside ICS · 01', title: 'Front-end web development', body: 'I could build the page. Then I learned about AI, and saw that by the time I finished a BS in Software Engineering and started looking for a job, AI would be doing most of this work.', tags: ['HTML', 'CSS', 'Bootstrap', 'JavaScript'] },
  { kind: 'detour', when: 'Alongside ICS · 02', title: 'Graphic design', body: 'Same conclusion as front-end. By the time I was ready for the job market, AI would be doing most of it.', tags: ['Photoshop', 'Canva'] },
  { kind: 'detour', when: 'Alongside ICS · 03', title: 'Digital marketing', body: 'Google Ads for two clients abroad and Facebook Ads for local ones. I learned how campaigns run and not much I wanted to keep doing.', tags: ['Google Ads', 'Facebook Ads'] },
  { kind: 'detour', when: 'Alongside ICS · 04', title: 'Video editing', body: 'Clips and edits in DaVinci Resolve. Fun for a while, not for a career.', tags: ['DaVinci Resolve'] },
  { kind: 'main', when: '2025', title: 'Penetration testing', body: 'Near the end of intermediate I found penetration testing, and this time it stuck.' },
  { kind: 'main', when: 'Practice', title: 'Labs and public CTFs', body: 'TryHackMe, Hack The Box, PicoCTF, PortSwigger and Hacker101. Every box I finished became a written report, and the repetitive parts became Python and Bash tools.' },
  { kind: 'main', when: '2026', title: 'CPENT certified', body: 'EC-Council Certified Penetration Testing Professional.' },
  { kind: 'main', when: 'Now', title: 'Open to work', body: 'One to two years of hands-on offensive security practice, ready to join a team and learn from real engagements.' },
];

export const CONTACT_FACTS = [
  ['Availability', 'Full-time, immediately'],
  ['Location', 'Remote, or on-site in Pakistan; open to relocation'],
  ['Languages', 'English (advanced), Urdu (fluent)'],
  ['Interested in', 'Offensive security, and the security field around it'],
];

// difficulty colours: muted, readable on paper, ordered light to serious
export const DIFFICULTY_ORDER = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Insane', 'Challenge'];
export const DIFF_TONE: Record<string, string> = {
  'Very Easy': '#5f7a8c',
  Easy: '#3f6e8c',
  Medium: '#a8642a',
  Hard: '#9e1b2c',
  Insane: '#6d1020',
  Challenge: '#6b5a2e',
};
export const toneOf = (d?: string | null) => DIFF_TONE[d ?? ''] ?? '#5f7a8c';

// the home-page ledger: mostly harder rooms, a couple of easy ones, newest first within each tier
export function ledger(size = 8, easySlots = 2) {
  const rank: Record<string, number> = { Insane: 5, Hard: 4, Medium: 3, Challenge: 2, Easy: 1, 'Very Easy': 0 };
  const isEasy = (w: Writeup) => (rank[w.difficulty ?? ''] ?? 2) <= 1;
  const hard = writeups.filter((w) => !isEasy(w)).sort((a, b) => (rank[b.difficulty ?? ''] ?? 2) - (rank[a.difficulty ?? ''] ?? 2) || (b.date ?? '').localeCompare(a.date ?? ''));
  const easy = writeups.filter(isEasy);
  return [...hard.slice(0, size - easySlots), ...easy.slice(0, easySlots)];
}

export const fmtDate = (d?: string | null) =>
  d ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';

// tool names as their projects write them (the writeups are free text, so this tidies the casing)
const TOOL_CASE: Record<string, string> = {
  nmap: 'Nmap', rustscan: 'RustScan', feroxbuster: 'Feroxbuster', gobuster: 'Gobuster', ffuf: 'FFUF', sqlmap: 'SQLMap', wpscan: 'WPScan',
  netcat: 'Netcat', nc: 'Netcat', curl: 'cURL', ssh: 'SSH', ftp: 'FTP', smbclient: 'SMBClient', smbmap: 'SMBMap', tshark: 'TShark',
  tcpdump: 'Tcpdump', gdb: 'GDB', hashcat: 'Hashcat', hydra: 'Hydra', linpeas: 'LinPEAS', searchsploit: 'SearchSploit', cewl: 'CeWL',
  'enum4linux': 'Enum4linux', steghide: 'Steghide', stegseek: 'Stegseek', exiftool: 'ExifTool', binwalk: 'Binwalk', objdump: 'Objdump',
  readelf: 'Readelf', strings: 'Strings', ltrace: 'Ltrace', checksec: 'Checksec', docker: 'Docker', sqlite3: 'SQLite3', perl: 'Perl',
  bash: 'Bash', python: 'Python', python3: 'Python3', wget: 'Wget', find: 'Find', file: 'File', gpg: 'GPG', gcc: 'GCC', jq: 'jq', xxd: 'xxd',
};
export function toolName(raw: string) {
  // only the first word of each part is a tool name; asides in brackets and commands with flags stay as typed
  const asides: string[] = [];
  const flat = raw.replace(/\([^)]*\)/g, (g) => `\u0000${asides.push(g) - 1}\u0000`);
  return flat.split(/(\s[/+]\s|,\s)/).map((part) => {
    if (/\s-{1,2}\w/.test(part) || /^\s[/+]\s$|^,\s$/.test(part)) return part;
    return part.replace(/^([A-Za-z][\w.-]*)/, (w) => TOOL_CASE[w.toLowerCase()] ?? (/2john$/i.test(w) || w.includes('.') ? w : w[0].toUpperCase() + w.slice(1)));
  }).join('').replace(/\u0000(\d+)\u0000/g, (_, i) => asides[Number(i)]);
}
