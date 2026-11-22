import { SITE, STATS, writeups, PROJECTS, PERSONAL_PROJECTS } from '../data/site';

export function GET() {
  const recent = writeups.slice(0, 10).map((w) => `- [${w.title} (${w.platform}, ${w.difficulty ?? 'lab'})](${SITE.url}/writeups/${w.slug}.html): ${w.summary}`);
  const projects = PROJECTS.filter((p) => p.href).map((p) => `- [${p.name}](${SITE.url}${p.slug ? `/projects/${p.slug}.html` : ''}): ${p.tagline}`);
  const personal = PERSONAL_PROJECTS.map((p) => `- [${p.name}](${p.href}): ${p.tagline}`);
  const body = `# ${SITE.name}

> CPENT-certified web and API penetration tester from Bahawalnagar, Punjab, Pakistan. TryHackMe top ${STATS.thmRank}% with ${STATS.rooms}+ rooms completed and ${STATS.writeups} public writeups. Open to roles in offensive security (penetration testing, web and API security, red team support, bug bounty) and the wider security field. Full-time, available immediately, remote preferred, open to relocation. Languages: English (advanced), Urdu (fluent).

## Start here
- [Portfolio](${SITE.url}/): how I work, proof of work, projects, toolkit, journey and contact.
- [Resume (PDF, one page)](${SITE.url}${SITE.resume}): skills, certification, projects, education.
- [Sample penetration test report (PDF)](${SITE.url}${SITE.report}): fictional company, written in plain language for executives and managers.
- [Technical appendix to the sample report (PDF)](${SITE.url}${SITE.appendix}): evidence, reproduction steps and fix examples for the IT team.
- [All writeups](${SITE.url}/writeups/): ${STATS.writeups} structured writeups from TryHackMe and Hack The Box, searchable and filterable.

## Recent writeups
${recent.join('\n')}

## Projects
${projects.join('\n')}

## Personal projects
${personal.join('\n')}

## Facts
- Certification: CPENT (Certified Penetration Testing Professional), EC-Council, 2026. Certificate ${SITE.certId}.
- Web and API security: Burp Suite, OWASP ZAP, SQLMap, FFUF, OWASP Top 10, authentication and access control, API security.
- Recon: Nmap, RustScan, Masscan, Nessus, Wireshark, NetExec.
- Exploitation and Active Directory: Metasploit, Hydra, Hashcat, BloodHound, Impacket, Kerberoasting, AS-REP roasting, DCSync, Cobalt Strike, Mythic.
- Pivoting and tooling: Ligolo-ng, Python, Bash, PowerShell, JavaScript, Docker.
- Education: Intermediate (HSSC), ICS, Al-Hayat College, 2023 to 2025, 87%.
- Method: scope, recon, exploit, escalate, report, retest.

## Contact
- Email: ${SITE.email}
- LinkedIn: ${SITE.linkedin}
- GitHub: ${SITE.github}
- TryHackMe: ${SITE.tryhackme}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
