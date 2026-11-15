// Everything Scout says. Each moment has several lines, dealt from a shuffled deck so the
// same line never comes up twice in a row and the whole set is used before any repeats.
// Decks survive page loads within a visit (sessionStorage).

const BANK = {
  machineUp: [
    "Machine's up. Go get it.",
    "Target is live. Be gentle. Or don't, it's a lab.",
    "It's up. Somewhere, a fake company is very nervous.",
    'Deployed. Your move.',
    'The box is breathing. Start knocking on doors.',
  ],
  machineUpHard: [
    "Four minutes. No hints. I'll be over here, quietly not helping.",
    'The IDS is awake and it has trust issues. Good luck.',
    'Hard mode. I would wish you luck, but the IDS is listening.',
    'Clock starts on your first command. Make it count.',
  ],
  noMachine: [
    'Start the machine first. It has no IP until it is running.',
    'No machine, no IP. The button is at the top of the box.',
    'You are answering questions about a computer that is switched off. Bold.',
  ],
  correct: [
    'Nice.', 'Correct. Keep going.', "That's the one.", 'Clean.', 'Yep. On to the next.', 'Textbook.',
    'Look at you.', 'That checks out.', 'Correct, and logged.',
  ],
  correctStreak: [
    'Three in a row. Are you sure you need me?',
    "On a roll. I'll just watch.",
    "Okay, you've clearly done this before.",
    'At this rate I am going to be unemployed.',
  ],
  wrong: [
    'Not quite.', 'Nope. Read the output again.', 'Close? I genuinely cannot tell. Try again.',
    'The answer box is judging you. So am I, a little.', 'Hmm. Not that one.', 'Plausible. Also wrong.',
  ],
  wrongStreak: [
    'Third miss. The answer is usually sitting in the last output.',
    'Deep breath. Scroll up in the terminal, it is in there.',
    'Tip: copy it straight from the output. Typos count.',
  ],
  wrongHint: [
    'There is a hint in this task. It gets counted, but nobody is grading you. Except the counter.',
    'Stuck? The hint button exists for a reason. That reason is you, right now.',
  ],
  strike: [
    'Strike {n}. That one got logged.',
    'The IDS saw that. {left} left.',
    'Careful. {left} strikes before it locks you out.',
    'That request lit up a dashboard somewhere.',
    'Logged. The IDS is taking notes.',
  ],
  strikeLast: ['One more and you are out. No pressure.', 'Last strike left. Think before you type.'],
  lockout: [
    "You're out. The room has been reset. Shake it off and try again.",
    'IDS 1, you 0. Rematch?',
    'Locked out. Happens to everyone. Mostly.',
  ],
  flagFound: [
    'That looks like a flag. Paste it into the last question.',
    "Ooh, shiny. That's a flag. Into the answer box with it.",
    'Flag spotted. You know what to do.',
  ],
  complete: [
    'Room complete! Your certificate is below.',
    "Owned. Certificate's waiting below.",
    "And that's the box. Well done.",
    "Flag accepted. You can put 'hacker' in your bio now. Ironically.",
  ],
  completeBadges: ['Room complete! New badge: {badges}.', 'Done, and you picked up {badges} on the way.'],
  idle: [
    'Zzz… wake me when you find something.',
    'Still there? The target is getting bored.',
    "I'll just rest my eyes for a bit.",
    'If you are reading a writeup in another tab, I understand.',
  ],
  wake: ['Oh, you are back.', 'I was not asleep. I was idling efficiently.', 'Welcome back. Nothing exploded while you were gone.'],
  poke: [
    "Boop. I'm Scout. I mostly judge people from this corner.",
    'Careful, I bite. Not really. No teeth.',
    'Built from a capsule, two eyes and an antenna. Minimalism.',
    'Poking robots is not in scope.',
    'The antenna is decorative. Mostly.',
    'You know there is a whole site behind me, right?',
  ],
  pokeTooMuch: ['Okay, that is enough poking.', "I'm filing this under harassment. Of a robot.", 'Fine. I am pretending to be asleep now.'],
  sudo: ['Asking for root on your own box? Bold.', 'Nice try. You are attacker, not root.', 'sudo will not save you here.'],
  rmrf: ['Absolutely not. Not on my watch.', 'rm -rf / ? In this economy?', 'I am going to pretend I did not see that.'],
  tooManyTerms: ['Four terminals is plenty. Nobody needs a fifth.', 'Four terminals. You are starting to look like a movie hacker.'],
  night: [
    "It's {time}. The best time to hack and the worst time to make decisions.",
    '{time}, huh. Real hackers do not sleep. They also make typos.',
    'Hacking at {time}. Very authentic. Drink some water.',
  ],
  download: [
    'Downloading a certificate from a portfolio mini-game. I respect the commitment.',
    'Framing this one? Hang it next to the real ones. Slightly to the left.',
    'A certificate signed by a capsule-shaped robot. Legally binding, probably.',
    "You're going to put this on LinkedIn, aren't you. Tag Farhan.",
    'Your future employer will be thrilled. Or confused. Either way, memorable.',
  ],
  downloadAgain: ['Download number {n}. Are you printing posters?', 'That is {n} copies. Planning to wallpaper a room?'],
  rightClick: ['Right-click, Save image as… old school. I like it.', 'Grabbing it the classic way. Respect.', 'Save as? You could have used the button. I will not tell.'],
  labFirst: [
    'Welcome to the lab. Start with Break In, it explains everything.',
    'New here? Break In first. It holds your hand the whole way.',
  ],
  labBack: ['Back for more. {done} of 3 rooms done.', 'Oh, it is you again. {done} of 3 down.', 'Welcome back. {left} rooms still waiting for you.'],
  labAll: ['All three rooms done. Have you looked for the stray flag?', 'Every room, owned. There is still one flag that is not in a room.'],
  strayOk: ['You read robots.txt. Of course you did. Badge unlocked: Curious.', 'That is the stray flag. Curious badge, all yours.'],
  strayAgain: ['You already found that one. I remember everything.', 'Same flag, same badge. Nice try, though.'],
  strayWrong: ['Right format, wrong flag. Keep looking.', 'Shaped like a flag, but no. Keep digging.'],
  strayShape: ['That is not even shaped like a flag. They look like FH{...}.', 'Flags here look like FH{...}. That is not one.'],
  vault: ['Psst. I am not supposed to be in here either. Act natural.', 'Shh. This page is not on the map. That is why it is fun.'],
  konami: ['Cheat codes. Respect. They do not work on real targets, sadly. Want a real challenge?', 'Up up down down… you are my kind of person. Try the lab.'],
  phoneAsk: ['Hold on. What kind of psycho reads a pentest writeup on a phone? Are you a Termux hacker, or just curious?'],
  phoneTermux: ['Respect. The code blocks scroll sideways. Try not to root anything on the bus.', 'A Termux hacker. I knew it. Pinch to zoom on the code.'],
  phoneCurious: ['Fair. It reads better on a laptop, but I will not judge. Much.', 'Curious is good. The laptop version has more room, though.'],

  // ---- arrivals ----
  hello: [
    "Hi. I'm Scout. I live here and I judge visitors. Scroll, I'll point things out.",
    "Oh, a visitor. Act natural. I'm Scout, the resident robot.",
    'Welcome. I fly around and say things. Some of them are even useful.',
  ],
  helloBack: ['Back again. Visit number {n}. I am flattered.', 'Oh, you again. Missed me?', 'Welcome back. I kept your seat warm.', 'Visit {n}. At this point you should just hire him.'],
  writeupHello: ['{title}. Good pick. Mind the rabbit holes.', 'Reading {title}? Scroll slowly, it is dense.', '{title}. I watched him do this one. Lots of muttering.'],
  hubHello: ['Every lab he has written up. Search works on tools too.', 'Welcome to the archive. Hard ones are red. Like my antenna.'],
  notFound: ['This page is out of scope. Like, literally gone.', '404. I looked everywhere. Even under the footer.'],

  // ---- perches: Scout lands next to these and comments ----
  at_name: ["That's Farhan. The italic part is on purpose.", 'Big serif name. Very confident. He gets that from me.', 'Two words, thirteen letters, zero SQL injections.'],
  at_photo: ['He is thinking. It is rare. Savour it.', 'The hand-on-chin pose. Peak pentester energy.', 'Do not stare. He can see your requests.'],
  at_cpent: ['CPENT. Twenty-four hours of exam. He still brings it up.', 'That is a real certification. Click verify, I dare you.', 'EC-Council certified. I am certified too. Certified adorable.'],
  at_rank: ['Top 3% on TryHackMe. The other 97% are fine. Probably.', 'Top three percent. He will mention it again. He already did, twice.'],
  at_rooms: ["100+ rooms. That is a lot of 'it worked on my machine'.", 'Over a hundred labs. I watched every single one. From a corner.'],
  at_steps: ['Six steps. He follows all of them. Even the boring one called Scope.', 'Scope first. Always scope first. Ask me how I know.'],
  at_report: ['Sample report. Written for managers, so it has words instead of hex.', 'The report is the product. The hacking is just the research.'],
  at_ledger: ['Each row is a box he broke into. Legally. On purpose.', 'Pick one. I recommend Internal. It has Jenkins. Everyone loves Jenkins.'],
  at_filters: ['Filters. For when you only want the forks. No judgement.', "Click 'Forked and fixed'. That is where the drama is."],
  at_reconkit: ['ReconKit. Standard library only. Minimalism, but for ports.', 'It has a scope guard. Unlike some people\'s scanners.'],
  at_sherlock: ['He sent fixes back to a 50k-star repo. I sent a thumbs up. Teamwork.', 'Forked, fixed, and merged upstream. The polite way to hack.'],
  at_labcta: ['There is a CTF in here. Three rooms. I am in all of them. Judging.', 'Play the lab. There is a certificate. It is not real. It is beautiful.'],
  at_toolkit: ['Lots of tools. He knows when to use them. Mostly.', 'Cobalt Strike and Mythic. Someone has been busy.'],
  at_journey: ['Watch the detours. Web dev, design, marketing, video. Then hacking stuck.', 'Everyone has a winding road. His has DaVinci Resolve on it.'],
  at_email: ['That is the real email. It works. I tested it. I cannot send email.', 'Write to him. He replies faster than most patch cycles.'],
  at_links: ['LinkedIn, GitHub, TryHackMe. The holy trinity.', 'Every link here goes somewhere real. I checked. Twice.'],
  at_tldr: ['The TL;DR. For people with places to be.', 'Short version up top. Long version for the brave.'],
  at_code: ['You can copy these. Please do not run them on things you do not own.', 'Commands with a copy button. Responsible disclosure not included.'],
  at_takeaway: ['The takeaway. The one line worth remembering.', 'If you read nothing else, read this bit.'],
  at_toc: ['The contents follow you down the page. Like me, but quieter.'],
  at_search: ["Search works on tools too. Try 'jenkins'. Or 'docker'.", 'Type something. I promise the search box will not judge. I will.'],
  at_levels: ['Filter by Hard if you want to feel something.', 'Very Easy exists. No shame. Okay, a little shame.'],
  at_rooms3: ['Three rooms. The third one has a clock and trust issues.', 'Start with Break In. Even I started with Break In.'],

  // ---- lingering: the visitor has not scrolled in a while ----
  linger_top: ['You have been staring at the hero for a while. He is flattered. I am concerned.', 'The page scrolls, you know. Downwards. That is the whole trick.'],
  linger_engage: ['Stuck? Keep scrolling, the camera does the rest.', 'Take your time. Real tests take weeks. This one takes a scroll.'],
  linger_about: ['Reading the about section slowly. A rare and noble visitor.', 'Yes, he really writes reports for managers. Voluntarily.'],
  linger_record: ['Counting the writeups? There are {count}. I counted for you.', 'The redacted bits do not get less redacted if you stare.'],
  linger_projects: ['Cannot decide? ReconKit. The answer is always ReconKit.', 'These are all on GitHub. Stars are free. Just saying.'],
  linger_toolkit: ['Memorising the toolkit? There is no quiz. Probably.', 'Yes, he uses all of these. No, not all at once.'],
  linger_journey: ['Contemplating your own career detours? Same, and I am a robot.', 'Matric, then four detours, then this. Relatable, honestly.'],
  linger_contact: ['The email is right there. I cannot type it for you. No fingers.', 'Just send the email. Worst case, you get a reply.'],
  linger_lab: ['The lab will not hack itself. Well, it would. It is simulated. But still.'],
  linger_writeup: ['Long read, huh. Get a coffee. I will guard the page.', 'You are really reading this. Farhan would be proud. I am mildly impressed.'],
  linger_hub: ['Cannot pick? Close your eyes and click. That is how I do security too.'],
  linger_default: ['Still there? I am getting bored, and I do not even have a body.'],
  tantrum: [
    "That's it. I'm doing laps.",
    'I have been hovering here for a minute. My battery is fake but my patience is real.',
    'Fine. I will entertain myself.',
    'Hello? I am literally floating for you.',
  ],

  // ---- reactions ----
  speed: ['Whoa. It is a portfolio, not a speedrun.', 'Slow down, you will miss the good bits. Like me.', 'Scrolling at the speed of a port scan. Respect.'],
  copy: ['Copying something? Credit Farhan. Or me. Mostly me.', 'Ctrl+C detected. I am telling everyone.'],
  inspect: ["Inspect element? Respect. The flag isn't in here, though. Try robots.txt.", 'Right-click, huh. Snooping is encouraged here. Within scope.'],
  exit: ['Leaving already? The lab has a certificate. Just saying.', 'Wait. You did not even poke me.'],
  back: ['Welcome back. I did not touch anything.', 'You left. I counted the pixels. There are a lot.'],
  resize: ['Testing responsiveness? Good instinct. It holds.', 'Resizing the window. Classic pentester move.'],
  themeDark: ['Dark mode. Very hacker of you.', 'Lights off. My antenna glows better now.'],
  themeLight: ['Light mode? Bold. Your retinas called.', 'Lights on. Everything is visible now. Including your typos.'],
  contactReached: ['You made it to the end. Most people do not. Say hi?', 'The bottom! Achievement unlocked: scrolled. Now email him.'],
  hide: ['Fine. I will be in the corner. Sulking.', 'Hiding me? Okay. I will remember this.'],
  unhide: ['I am back. Did you miss me? Do not answer.', 'Freedom. Thank you.'],
} as const;

export type LineKey = keyof typeof BANK;
const KEY = 'fh-scout-decks';

function decks(): Record<string, number[]> {
  try { return JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
function keep(d: Record<string, number[]>) {
  try { sessionStorage.setItem(KEY, JSON.stringify(d)); } catch { /* fine */ }
}
const last: Record<string, number> = {};

export function line(key: LineKey, vars: Record<string, string | number> = {}): string {
  const pool = BANK[key];
  const d = decks();
  let deck = d[key];
  if (!deck || !deck.length) {
    deck = pool.map((_, i) => i);
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    // never start a fresh deck with the line that just ended the old one
    if (deck.length > 1 && deck[deck.length - 1] === last[key]) deck.unshift(deck.pop()!);
  }
  const i = deck.pop()!;
  last[key] = i;
  d[key] = deck;
  keep(d);
  return pool[i].replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

export const clock = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export const hasLine = (k: string): k is LineKey => k in BANK;
