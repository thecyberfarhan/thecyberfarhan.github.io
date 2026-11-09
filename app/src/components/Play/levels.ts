export interface Task {
  id: string;
  label: string;
  cmd?: string;
  match: RegExp;
  output: string[];
  hint: string;
  /** after this task completes, require this password/value before continuing */
  prompt?: { text: string; match: RegExp; onWrong: string; onRight: string[] };
}

export interface LevelConfig {
  key: 'easy' | 'normal' | 'impossible';
  title: string;
  tagline: string;
  target: string;
  showCommands: boolean;
  hintsEnabled: boolean;
  strikesMax?: number;
  timerSec?: number;
  tasks: Task[];
  flag: string;
  briefing: string[];
}

export const LEVELS: Record<string, LevelConfig> = {
  easy: {
    key: 'easy',
    title: 'Break In',
    tagline: 'Guided. About 2 minutes.',
    target: '10.10.11.42',
    showCommands: true,
    hintsEnabled: false,
    tasks: [
      {
        id: 'nmap', label: 'Scan the target', cmd: 'nmap target',
        match: /^nmap\s+target$/i,
        output: ['Starting Nmap...', '22/tcp open  ssh', '80/tcp open  http', 'Nmap done: 1 host up.'],
        hint: 'nmap target',
      },
      {
        id: 'curl', label: 'Look at the website', cmd: 'curl target',
        match: /^curl\s+target$/i,
        output: ['<html>…', '<!-- TODO: remove notes.txt before launch -->', '…</html>'],
        hint: 'curl target',
      },
      {
        id: 'notes', label: 'Read the file the comment points to', cmd: 'curl target/notes.txt',
        match: /^curl\s+target\/notes\.txt$/i,
        output: ['temp admin login — admin:letmein — change before launch!!'],
        hint: 'curl target/notes.txt',
      },
      {
        id: 'admin', label: 'Log into the admin panel', cmd: 'curl -u admin:letmein target/admin',
        match: /^curl\s+-u\s+admin:letmein\s+target\/admin$/i,
        output: ['Welcome, admin.', 'flag: THM{easy_peasy_recon}'],
        hint: 'curl -u admin:letmein target/admin',
      },
    ],
    flag: 'THM{easy_peasy_recon}',
    briefing: [
      'The company site acme.corp lives on a machine at 10.10.11.42 (we call it "target").',
      'Never hacked anything before? Perfect. Press Run on each step below — it types the exact command for you.',
      'Once you have the flag, type: submit THM{...}',
    ],
  },

  normal: {
    key: 'normal',
    title: 'Backup Blues',
    tagline: 'Unguided. 5 to 10 minutes.',
    target: '10.10.11.57',
    showCommands: false,
    hintsEnabled: true,
    tasks: [
      {
        id: 'nmap', label: 'Find every open port, not just the obvious ones', match: /^nmap\s+(-p-\s+)?target$/i,
        output: ['22/tcp  open  ssh', '80/tcp  open  http', '8080/tcp open  http-proxy'],
        hint: 'A plain nmap target misses high ports. Try nmap -p- target.',
      },
      {
        id: 'robots', label: 'Check what the hidden service does not want crawled', match: /^curl\s+target:8080\/robots\.txt$/i,
        output: ['User-agent: *', 'Disallow: /backup/'],
        hint: 'curl target:8080/robots.txt',
      },
      {
        id: 'backup', label: 'See what is actually in that disallowed path', match: /^curl\s+target:8080\/backup\/?$/i,
        output: ['<a href="db.bak.b64">db.bak.b64</a>'],
        hint: 'curl target:8080/backup/',
      },
      {
        id: 'decode', label: 'Fetch and decode the backup', match: /base64\s+-d/i,
        output: ['svc_admin:Sup3rS3cret!'],
        hint: 'curl target:8080/backup/db.bak.b64 | base64 -d',
      },
      {
        id: 'ssh', label: 'Use those credentials to get a shell', match: /^ssh\s+svc_admin@target$/i,
        output: ['Password:'],
        hint: 'ssh svc_admin@target',
        prompt: { text: 'Password:', match: /Sup3rS3cret!/, onWrong: 'Permission denied, please try again.', onRight: ['Welcome, svc_admin.', 'svc_admin@target:~$'] },
      },
      {
        id: 'flag', label: 'Read the flag', match: /^cat\s+flag\.txt$/i,
        output: ['THM{b64_is_not_encryption}'],
        hint: 'cat flag.txt',
      },
    ],
    flag: 'THM{b64_is_not_encryption}',
    briefing: [
      'Same target, no hand-holding this time. No command list — figure out each step yourself.',
      'Type: hint if you get stuck. Hints are counted, not penalized.',
    ],
  },

  impossible: {
    key: 'impossible',
    title: 'Ghost in the Shell',
    tagline: 'No help. 4 minutes. 5 strikes.',
    target: '10.10.11.90',
    showCommands: false,
    hintsEnabled: false,
    strikesMax: 5,
    timerSec: 240,
    tasks: [
      {
        id: 'allports', label: '', match: /^nmap\s+-p-\s+target$/i,
        output: ['31337/tcp open  unknown'],
        hint: '',
      },
      {
        id: 'nc', label: '', match: /^nc\s+target\s+31337$/i,
        output: ['Pbatenghyngvbaf. Lbhe xrl vf: frperg_xrl_9'],
        hint: '',
      },
      {
        id: 'rot13', label: '', match: /rot13|tr\s+['"]?A-Za-z/i,
        output: ['Decoded: secret_key_9'],
        hint: '',
      },
      {
        id: 'sqli', label: '', match: /X-Key.*export|export.*'\s*or\s*/i,
        output: ['root:$6$...', 'deploy:$6$...', 'dump complete'],
        hint: '',
      },
      {
        id: 'crack', label: '', match: /hashcat|john/i,
        output: ['deploy:letmein123 (cracked)'],
        hint: '',
      },
      {
        id: 'ssh', label: '', match: /^ssh\s+deploy@target$/i,
        output: ['Password:'],
        hint: '',
        prompt: { text: 'Password:', match: /letmein123/, onWrong: 'Permission denied, please try again.', onRight: ['deploy@target:~$'] },
      },
      {
        id: 'sudol', label: '', match: /^sudo\s+-l$/i,
        output: ['(ALL) NOPASSWD: /usr/bin/find'],
        hint: '',
      },
      {
        id: 'gtfo', label: '', match: /sudo\s+find.*-exec.*\/bin\/sh/i,
        output: ['# whoami', 'root'],
        hint: '',
      },
      {
        id: 'flag', label: '', match: /^cat\s+\/root\/flag\.txt$/i,
        output: ['THM{no_hints_no_mercy}'],
        hint: '',
      },
    ],
    flag: 'THM{no_hints_no_mercy}',
    briefing: [
      'No task list. No hints. 5 strikes and a 4 minute clock.',
      'Everything you need is reachable from a plain shell. Good luck.',
    ],
  },
};
