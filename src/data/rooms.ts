// The three practice rooms. Everything here is simulated: commands are matched against
// these patterns as text and nothing ever runs. Each room has TryHackMe-style tasks
// (questions answered in the room panel), a target "machine" (terminal responses) and
// a target website for the browser window inside the box.

export type Ask = { re: RegExp; gives: string; out: string; shell?: string };
export type Act = {
  re: RegExp;
  needs?: string[];
  gives?: string;
  has?: string;
  out: string;
  strike?: string;
  ask?: Ask;
  save?: { name: string; content: string };
  inShell?: boolean;
  shell?: string;
};
export type Question = { q: string; a: string[]; ph?: string; flag?: boolean };
export type Task = { title: string; body: string; cmd?: string; cmdWhy?: string; browse?: string; hint?: string; questions: Question[] };
export type Block = ['h1' | 'p' | 'pre' | 'small', string] | ['links', [string, string][]] | ['login'];
export type Page = { title: string; status?: number; blocks: Block[]; source: string; gives?: string; needs?: string[]; strike?: string };
export type Room = {
  slug: string;
  name: string;
  level: 'Easy' | 'Medium' | 'Hard';
  minutes: string;
  tags: string[];
  blurb: string;
  intro: string[];
  guided: boolean;
  hints: boolean;
  limit: number;
  strikes: number;
  tasks: Task[];
  acts: Act[];
  site: (url: URL) => Page;
  login?: { user: string; pass: string; ok: Page };
  boot: string[];
  debrief: { title: string; points: string[]; fix: string[] };
};

export const IP = '10.10.11.42';
const T = '(?:target|10\\.10\\.11\\.42)';
const ipQ: Question = { q: 'Start the machine. What is the target\'s IP address?', a: [IP], ph: '10.10.x.x' };

// ---------- Room 1 ----------
const B64 = 'c3ZjX2FkbWluOlN1cDNyUzNjcmV0IQ==';
const ROT = 'frperg_xrl_9';
const HASH_D = '4ca7c5c27c2314eecc71f67501abb724';
const HASH_R = '4ece57a61323b52ccffdbef021956754';

const notFound = (url: URL): Page => ({
  title: '404 Not Found', status: 404,
  blocks: [['h1', 'Not Found'], ['p', `The requested URL ${url.pathname} was not found on this server.`], ['small', 'Apache/2.4.41 (Ubuntu) Server at target Port ' + (url.port || '80')]],
  source: `<h1>Not Found</h1>\n<p>The requested URL ${url.pathname} was not found on this server.</p>`,
});

const breakIn: Room = {
  slug: 'break-in',
  name: 'Break In',
  level: 'Easy',
  minutes: '5 min',
  tags: ['Recon', 'Web', 'Guided'],
  blurb: 'Never hacked anything? Start here. Every step is explained, and you can do the whole room by pressing Run.',
  intro: [
    'Acme Corp is launching a new website, and someone wants to know if it is safe. You have been asked to find out.',
    'Start the machine, then start the box. Each task explains one idea and gives you the exact command. Press Run, read what comes back, and answer the question.',
  ],
  guided: true,
  hints: true,
  limit: 0,
  strikes: 0,
  boot: ['Welcome to the lab box.', 'Type help to see what you can do, or press Run on a task.'],
  tasks: [
    { title: 'Connect to the target', body: 'Every practice room starts with a machine to attack. Press Start machine at the top of the box. After a few seconds it gets an IP address, the number other computers use to reach it. In this room you can also just call it target.', questions: [ipQ] },
    { title: 'Scan for open doors', body: 'A computer has numbered doors called ports. Each open port runs a service: a website, a login, a mail server. nmap knocks on the doors and reports which ones are open.', cmd: 'nmap target', questions: [
      { q: 'How many ports are open?', a: ['2', 'two'], ph: 'a number' },
      { q: 'Which port serves the website?', a: ['80', '80/tcp', 'port 80'], ph: 'a port number' },
    ] },
    { title: 'Read the website', body: 'Port 80 is a website. curl fetches a page and prints it as text, like a browser without pictures, which means you also see things browsers hide, like developer comments (they look like <!-- this -->). You can also open it in the Browser tab and use View source.', cmd: 'curl target', browse: 'http://target/', questions: [
      { q: 'Which file does the developer\'s comment mention?', a: ['notes.txt', '/notes.txt'], ph: 'filename.ext' },
    ] },
    { title: 'Follow the clue', body: 'Developers leave notes for each other and sometimes forget to delete them. Ask the server for the file the same way.', cmd: 'curl target/notes.txt', browse: 'http://target/notes.txt', questions: [
      { q: 'What is the admin password?', a: ['letmein'], ph: 'password' },
    ] },
    { title: 'Log in and capture the flag', body: 'You have a username and a password. curl -u sends them to the /admin page. In the Browser tab you can type them into the login form instead. Behind the login is the flag: proof that you got in.', cmd: 'curl -u admin:letmein target/admin', browse: 'http://target/admin', questions: [
      { q: 'What is the flag?', a: ['FH{easy_peasy_recon}'], ph: 'FH{...}', flag: true },
    ] },
  ],
  acts: [
    { re: new RegExp('^nmap\\b.*' + T), gives: 'scan', out: `Starting Nmap 7.94 ( https://nmap.org )\nNmap scan report for target (${IP})\nHost is up (0.031s latency).\nNot shown: 998 closed tcp ports\nPORT   STATE SERVICE\n22/tcp open  ssh\n80/tcp open  http\n\nNmap done: 1 IP address (1 host up) scanned in 1.42 seconds` },
    { re: new RegExp('^curl\\b(?=.*(?:admin:letmein))(?=.*' + T + '/admin)'), gives: 'flag', out: 'Welcome back, admin.\n\nFH{easy_peasy_recon}' },
    { re: new RegExp('^curl\\b.*' + T + '/admin'), out: '401 Unauthorized\nThis page needs a username and password. Send them with: curl -u user:pass target/admin' },
    { re: new RegExp('^curl\\b.*' + T + '/notes\\.txt'), gives: 'notes', out: 'admin panel: /admin\nlogin: admin / letmein\n\n(remove before launch!!)' },
    { re: new RegExp('^curl\\b(?:\\s+-\\w+)*\\s+(?:https?://)?' + T + '/?$'), gives: 'home', out: '<!doctype html>\n<html>\n<head><title>Acme Corp</title></head>\n<body>\n  <h1>Coming soon</h1>\n  <p>Our new website launches next week.</p>\n  <!-- TODO: remove /notes.txt before launch -->\n</body>\n</html>' },
  ],
  site: (url) => {
    if (url.port && url.port !== '80') return { title: 'Unable to connect', status: 0, blocks: [['h1', 'Unable to connect'], ['p', `Nothing is listening on port ${url.port}.`]], source: '' };
    if (url.pathname === '/' || url.pathname === '/index.html') return {
      title: 'Acme Corp', gives: 'home',
      blocks: [['h1', 'Coming soon'], ['p', 'Our new website launches next week.']],
      source: '<!doctype html>\n<html>\n<head><title>Acme Corp</title></head>\n<body>\n  <h1>Coming soon</h1>\n  <p>Our new website launches next week.</p>\n  <!-- TODO: remove /notes.txt before launch -->\n</body>\n</html>',
    };
    if (url.pathname === '/notes.txt') return { title: 'notes.txt', gives: 'notes', blocks: [['pre', 'admin panel: /admin\nlogin: admin / letmein\n\n(remove before launch!!)']], source: 'admin panel: /admin\nlogin: admin / letmein\n\n(remove before launch!!)' };
    if (url.pathname === '/admin') return { title: 'Admin login', blocks: [['h1', 'Acme admin'], ['login']], source: '<h1>Acme admin</h1>\n<form method="post">\n  <input name="user"> <input name="pass" type="password">\n  <button>Log in</button>\n</form>' };
    return notFound(url);
  },
  login: { user: 'admin', pass: 'letmein', ok: { title: 'Admin', gives: 'flag', blocks: [['h1', 'Welcome back, admin.'], ['pre', 'FH{easy_peasy_recon}']], source: '<h1>Welcome back, admin.</h1>\n<pre>FH{easy_peasy_recon}</pre>' } },
  debrief: {
    title: 'What you just did',
    points: [
      'Recon: you found what the machine exposes before touching anything, exactly how a real test starts.',
      'Information disclosure: a comment in public HTML pointed to a file that should never have been online.',
      'Credential exposure: that file held a working admin password.',
    ],
    fix: ['Strip comments and test files from production builds.', 'Never store passwords in files a web server can serve.', 'Put admin panels behind proper authentication, ideally not on the public internet.'],
  },
};

// ---------- Room 2 ----------
const backupBlues: Room = {
  slug: 'backup-blues',
  name: 'Backup Blues',
  level: 'Medium',
  minutes: '10 min',
  tags: ['Enumeration', 'Encoding', 'SSH'],
  blurb: 'A small company left something lying around. You get the route, not the commands. Hints are there if you need them, and they are counted.',
  intro: [
    'A small company runs a web server and a forgotten backup portal. Somewhere in there is a way onto the machine.',
    'The tasks tell you what to look for. Working out the commands is up to you. Type help in the box for the tools you have.',
  ],
  guided: false,
  hints: true,
  limit: 0,
  strikes: 0,
  boot: ['Welcome to the lab box.', 'Tools: nmap, curl, wget, nc, ssh, base64, cat, ls. Type help for more.'],
  tasks: [
    { title: 'Connect to the target', body: 'Start the machine and note its IP.', questions: [ipQ] },
    { title: 'Enumerate', body: 'Not every web server lives on port 80. Find every open port.', hint: 'Run nmap against the target and read every line of the result.', questions: [
      { q: 'Which port runs the second web server?', a: ['8080', '8080/tcp'], ph: 'port' },
    ] },
    { title: 'What are they hiding?', body: 'Web servers often tell search engines which folders to skip, in a file anyone can read.', hint: 'robots.txt lives at the root of a web server. Ask the one on 8080 for it.', questions: [
      { q: 'Which folder does robots.txt ask crawlers to ignore?', a: ['/backup/', '/backup', 'backup', 'backup/'], ph: '/folder/' },
    ] },
    { title: 'Loot', body: 'Walk into that folder and take what you find.', hint: 'Open the folder in curl or the browser, then fetch the file it lists. wget saves it to your box.', questions: [
      { q: 'What is the name of the file in the folder?', a: ['db.bak.b64'], ph: 'filename' },
      { q: 'Which encoding is the file in?', a: ['base64', 'base 64', 'b64'], ph: 'encoding' },
    ] },
    { title: 'Decode it', body: 'Encoding is not encryption. Anyone can reverse it.', hint: 'base64 -d decodes. Run it on the saved file, or pipe the text into it with echo.', questions: [
      { q: 'Which username is inside?', a: ['svc_admin'], ph: 'username' },
    ] },
    { title: 'Get a shell and capture the flag', body: 'You have a username, a password and an open SSH port.', hint: 'ssh svc_admin@target, then the password. Look around with ls, read with cat.', questions: [
      { q: 'What is the flag?', a: ['FH{b64_is_not_encryption}'], ph: 'FH{...}', flag: true },
    ] },
  ],
  acts: [
    { re: new RegExp('^nmap\\b.*' + T), gives: 'scan', out: `Starting Nmap 7.94\nNmap scan report for target (${IP})\nPORT     STATE SERVICE\n22/tcp   open  ssh\n80/tcp   open  http\n8080/tcp open  http-proxy\n\nNmap done: 1 IP address (1 host up) scanned in 2.07 seconds` },
    { re: new RegExp('^(?:curl|wget)\\b.*' + T + ':8080/robots\\.txt'), gives: 'robots', out: 'User-agent: *\nDisallow: /backup/' },
    { re: new RegExp('^wget\\b.*' + T + ':8080/backup/db\\.bak\\.b64'), gives: 'b64', save: { name: 'db.bak.b64', content: B64 }, out: `--2026-11-15--  http://target:8080/backup/db.bak.b64\nConnecting to target (${IP}):8080... connected.\nHTTP request sent, awaiting response... 200 OK\nLength: 33\nSaving to: 'db.bak.b64'\n\ndb.bak.b64   100%[==========>]   33  --.-KB/s   in 0s\n\n'db.bak.b64' saved [33/33]` },
    { re: new RegExp('^curl\\b(?=.*\\s-[oO]\\b)(?=.*' + T + ':8080/backup/db\\.bak\\.b64)'), gives: 'b64', save: { name: 'db.bak.b64', content: B64 }, out: '  % Total    % Received\n100    33  100    33\n\nSaved db.bak.b64' },
    { re: new RegExp('^curl\\b.*' + T + ':8080/backup/db\\.bak\\.b64'), gives: 'b64', out: B64 },
    { re: new RegExp('^(?:curl|wget)\\b.*' + T + ':8080/backup/?$'), gives: 'listing', out: 'Index of /backup\n\n  Name          Last modified       Size\n  db.bak.b64    2026-10-02 14:11    33' },
    { re: new RegExp('^(?:curl|wget)\\b.*' + T + ':8080/?$'), out: '<h1>Backup portal</h1>\n<p>Internal use only.</p>' },
    { re: /base64\s+(-d|--decode)/, has: B64, gives: 'creds', out: 'svc_admin:Sup3rS3cret!' },
    { re: /(?:base64\s+(?:-d|--decode)\s+db\.bak\.b64|cat\s+db\.bak\.b64\s*\|\s*base64\s+(?:-d|--decode))/, needs: ['b64'], gives: 'creds', out: 'svc_admin:Sup3rS3cret!' },
    { re: new RegExp('^ssh\\b.*svc_admin@' + T), out: "svc_admin@target's password:", ask: { re: /^Sup3rS3cret!$/, gives: 'shell', shell: 'svc_admin@target', out: 'Welcome to Ubuntu 22.04.3 LTS\n\nLast login: Thu Oct  2 14:20:11 2026\nYou have a shell as svc_admin.' } },
    { re: /^ls\b/, inShell: true, out: 'flag.txt  notes.md' },
    { re: /^cat\s+(?:\.\/)?flag\.txt$/, inShell: true, gives: 'flag', out: 'FH{b64_is_not_encryption}' },
    { re: /^cat\s+(?:\.\/)?notes\.md$/, inShell: true, out: '- rotate the backup password (it has been 3 years)\n- move /backup off the web server' },
    { re: new RegExp('^curl\\b(?:\\s+-\\w+)*\\s+(?:https?://)?' + T + '/?$'), out: '<h1>It works!</h1>\n<p>This is the default web page for this server.</p>' },
  ],
  site: (url) => {
    if (url.port === '8080') {
      if (url.pathname === '/') return { title: 'Backup portal', blocks: [['h1', 'Backup portal'], ['p', 'Internal use only.']], source: '<h1>Backup portal</h1>\n<p>Internal use only.</p>' };
      if (url.pathname === '/robots.txt') return { title: 'robots.txt', gives: 'robots', blocks: [['pre', 'User-agent: *\nDisallow: /backup/']], source: 'User-agent: *\nDisallow: /backup/' };
      if (url.pathname === '/backup/' || url.pathname === '/backup') return { title: 'Index of /backup', gives: 'listing', blocks: [['h1', 'Index of /backup'], ['links', [['db.bak.b64', 'http://target:8080/backup/db.bak.b64']]], ['small', 'Apache/2.4.41 Server at target Port 8080']], source: '<h1>Index of /backup</h1>\n<a href="db.bak.b64">db.bak.b64</a>' };
      if (url.pathname === '/backup/db.bak.b64') return { title: 'db.bak.b64', gives: 'b64', blocks: [['pre', B64]], source: B64 };
      return notFound(url);
    }
    if (url.port && url.port !== '80') return { title: 'Unable to connect', status: 0, blocks: [['h1', 'Unable to connect'], ['p', `Nothing is listening on port ${url.port}.`]], source: '' };
    if (url.pathname === '/') return { title: 'Apache2 Default Page', blocks: [['h1', 'It works!'], ['p', 'This is the default web page for this server.']], source: '<h1>It works!</h1>\n<p>This is the default web page for this server.</p>' };
    return notFound(url);
  },
  debrief: {
    title: 'What you just did',
    points: [
      'Full enumeration: the interesting service was on 8080, not the obvious port 80.',
      'robots.txt is a public file. Listing a folder there advertises it.',
      'Base64 is an encoding, not a lock. The "backup" was a plain-text password.',
    ],
    fix: ['Keep backups off web servers entirely.', 'Never rely on robots.txt or unlisted paths to hide anything.', 'Rotate service passwords and use SSH keys instead of passwords.'],
  },
};

// ---------- Room 3 ----------
const ghost: Room = {
  slug: 'ghost-in-the-shell',
  name: 'Ghost in the Shell',
  level: 'Hard',
  minutes: '4 min, timed',
  tags: ['Hidden service', 'SQLi', 'Privesc'],
  blurb: 'No hints, no commands, a four-minute clock and an intrusion detection system that locks you out after five strikes. Almost nobody finishes.',
  intro: [
    'A hardened box that logs everything. Wrong guesses, blocked requests and failed logins all count as strikes. Five strikes and the IDS drops you, and the room resets.',
    'The clock starts with your first command. Root flag only. Your box runs Arch, btw.',
  ],
  guided: false,
  hints: false,
  limit: 240,
  strikes: 5,
  boot: ['Welcome to the lab box. The target logs everything.', 'Clock starts on your first command. Good luck.'],
  tasks: [
    { title: 'Connect to the target', body: 'Start the machine.', questions: [ipQ] },
    { title: 'Find what is hiding', body: 'The obvious scan shows the obvious ports.', questions: [{ q: 'Which port is the auth service on?', a: ['31337', '31337/tcp'], ph: 'port' }] },
    { title: 'Break the token', body: 'The service hands out a challenge. It is not as clever as it thinks.', questions: [{ q: 'What is the decoded key?', a: ['secret_key_9'], ph: 'key' }] },
    { title: 'Dump and crack', body: 'The key opens an internal dashboard. Its report export trusts its input.', questions: [
      { q: 'Whose password did you crack?', a: ['deploy'], ph: 'username' },
      { q: 'What was the password?', a: ['letmein123'], ph: 'password' },
    ] },
    { title: 'Escalate', body: 'You are in, but not as root.', questions: [{ q: 'Which binary can that user run as root?', a: ['find', '/usr/bin/find'], ph: 'binary' }] },
    { title: 'Own the box', body: 'Read the root flag.', questions: [{ q: 'What is the root flag?', a: ['FH{no_hints_no_mercy}'], ph: 'FH{...}', flag: true }] },
  ],
  acts: [
    { re: new RegExp('^nmap\\b(?=.*-p-)(?=.*' + T + ')'), gives: 'allports', out: `Starting Nmap 7.94 (all 65535 ports)\nPORT      STATE SERVICE\n22/tcp    open  ssh\n80/tcp    open  http\n31337/tcp open  Elite\n\nNmap done: 1 IP address (1 host up)` },
    { re: new RegExp('^nmap\\b.*' + T), out: 'Starting Nmap 7.94\nPORT   STATE SERVICE\n22/tcp open  ssh\n80/tcp open  http\n\nNothing else on the top 1000 ports.' },
    { re: new RegExp('^nc\\b.*' + T + '\\s+31337'), needs: ['allports'], gives: 'banner', out: `AUTH SERVICE v0.9\nChallenge token (rot13): ${ROT}\nDecode it and send it in an X-Key header to the web server.` },
    { re: new RegExp('(rot13|tr\\b.*N-ZA-Mn-za-m).*' + ROT + '|' + ROT + '.*(rot13|tr\\b.*N-ZA-Mn-za-m)'), needs: ['banner'], gives: 'key', out: 'secret_key_9' },
    { re: new RegExp('^curl\\b(?=.*-H\\s*["\']?X-Key:\\s*secret_key_9)(?=.*' + T + "/export\\?id=.*(?:'|%27).*(?:\\bor\\b|%20or%20|\\+or\\+))", 'i'), needs: ['key'], gives: 'hash', out: `id | user   | hash\n 1 | root   | ${HASH_R}\n 2 | deploy | ${HASH_D}\n 3 | guest  | (no access)` },
    { re: new RegExp('^curl\\b(?=.*-H\\s*["\']?X-Key:\\s*secret_key_9)(?=.*' + T + '/export\\?id=)'), needs: ['key'], strike: 'Request flagged by the WAF.', out: 'id | user  | hash\n 1 | guest | (no access)' },
    { re: new RegExp('^curl\\b(?=.*-H\\s*["\']?X-Key:\\s*secret_key_9)(?=.*' + T + ')'), needs: ['key'], gives: 'dash', out: 'Internal dashboard\n  /export?id=<n>   report export' },
    { re: new RegExp('^curl\\b.*' + T), strike: '403 Forbidden. The IDS noticed.', out: '403 Forbidden' },
    { re: new RegExp('^(hashcat|john|crack)\\b.*' + HASH_D), needs: ['hash'], gives: 'pw', out: `${HASH_D}:letmein123\n\nStatus: Cracked` },
    { re: new RegExp('^(hashcat|john|crack)\\b.*' + HASH_R), needs: ['hash'], out: 'Exhausted. Not in the wordlist. Do not waste time on this one.' },
    { re: new RegExp('^ssh\\b.*deploy@' + T), needs: ['pw'], out: "deploy@target's password:", ask: { re: /^letmein123$/, gives: 'shell', shell: 'deploy@target', out: 'You are in as deploy (not root).' } },
    { re: new RegExp('^ssh\\b.*root@' + T), strike: 'Permission denied (publickey). Logged.', out: 'Permission denied (publickey).' },
    { re: /^sudo\s+-l\b/, inShell: true, gives: 'sudol', out: 'User deploy may run the following commands on target:\n    (root) NOPASSWD: /usr/bin/find' },
    { re: /^sudo\s+find\b.*-exec\s+\/bin\/(ba)?sh/, inShell: true, gives: 'root', shell: 'root@target', out: '# whoami\nroot' },
    { re: /^cat\s+\/root\/flag\.txt$/, inShell: true, needs: ['root'], gives: 'flag', out: 'FH{no_hints_no_mercy}' },
    { re: /^cat\s+\/root\/flag\.txt$/, inShell: true, strike: 'Permission denied. Logged.', out: 'cat: /root/flag.txt: Permission denied' },
    { re: /^(ls|id|whoami)\b/, inShell: true, out: 'deploy' },
  ],
  site: () => ({ title: '403 Forbidden', status: 403, strike: 'Browser request blocked. The IDS noticed.', blocks: [['h1', 'Forbidden'], ['p', 'You don\'t have permission to access this resource.'], ['small', 'Request logged.']], source: '<h1>Forbidden</h1>' }),
  debrief: {
    title: 'What you just did',
    points: [
      'A full port scan found a service the default scan never shows.',
      'ROT13 is a toy cipher: the "challenge" was readable by anyone.',
      'SQL injection in the report export dumped password hashes, and one was weak enough to crack.',
      'A sudo rule for find is a known escape to a root shell.',
    ],
    fix: ['Scan your own hosts on all ports, not the top 1000.', 'Use parameterised queries everywhere input reaches SQL.', 'Enforce strong passwords and salted, slow hashing.', 'Audit sudo rules against GTFOBins.'],
  },
};

export const ROOMS: Room[] = [breakIn, backupBlues, ghost];
export const roomBySlug = (s: string) => ROOMS.find((r) => r.slug === s);
export const countQuestions = (r: Room) => r.tasks.reduce((n, t) => n + t.questions.length, 0);
