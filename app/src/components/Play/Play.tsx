import { useEffect, useRef, useState } from 'react';
import Section from '../Section/Section';
import { useReveal } from '../../lib/useReveal';
import { LEVELS, type LevelConfig } from './levels';
import styles from './Play.module.css';

type Line = { text: string; cls?: 'y' | 'ok' | 'r' | 'c' };

function bestKey(level: string) { return `gbest_${level}`; }

function useGame(level: LevelConfig) {
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [strikes, setStrikes] = useState(0);
  const [timeLeft, setTimeLeft] = useState(level.timerSec ?? 0);
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [pending, setPending] = useState<null | { taskId: string; prompt: NonNullable<ReturnType<() => LevelConfig['tasks'][number]['prompt']>> }>(null);
  const [best, setBest] = useState<number | null>(null);
  const [hints, setHints] = useState(0);
  const t0 = useRef(0);

  useEffect(() => {
    try { const v = localStorage.getItem(bestKey(level.key)); if (v) setBest(Number(v)); } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level.key]);

  useEffect(() => {
    if (!level.timerSec || !started || won || lost) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { setLost(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [level.timerSec, started, won, lost]);

  function print(text: string, cls?: Line['cls']) {
    setLines((prev) => [...prev, { text, cls }]);
  }

  function start() {
    setStarted(true);
    setDone(new Set());
    setStrikes(0);
    setTimeLeft(level.timerSec ?? 0);
    setWon(false);
    setLost(false);
    setPending(null);
    setHints(0);
    t0.current = Date.now();
    setLines(level.briefing.map((b, i) => ({ text: b, cls: i === 0 ? 'y' : 'c' })));
  }

  function strike(why: string) {
    print(why, 'r');
    if (level.strikesMax) {
      setStrikes((s) => {
        const next = s + 1;
        if (next >= level.strikesMax!) setLost(true);
        return next;
      });
    }
  }

  function finishWin() {
    setWon(true);
    const elapsed = Math.round((Date.now() - t0.current) / 1000);
    setBest((prev) => {
      if (prev === null || elapsed < prev) {
        try { localStorage.setItem(bestKey(level.key), String(elapsed)); } catch { /* ignore */ }
        return elapsed;
      }
      return prev;
    });
    print(`ROOM COMPLETE in ${elapsed}s${hints ? ` with ${hints} hint${hints === 1 ? '' : 's'}` : ''}.`, 'ok');
  }

  function nextTask() {
    return level.tasks.find((t) => !done.has(t.id));
  }

  function runCommand(raw: string) {
    const line = raw.trim();
    if (!line || won || lost) return;
    print(`$ ${line}`, 'c');

    if (pending) {
      if (pending.prompt.match.test(line)) {
        pending.prompt.onRight.forEach((l) => print(l));
        setDone((d) => new Set(d).add(pending.taskId));
        setPending(null);
      } else {
        strike(pending.prompt.onWrong);
      }
      return;
    }

    const lower = line.toLowerCase();
    if (lower === 'help') { print('Type the command for the current task. "hint" for a nudge, "clear" to tidy up.', 'y'); return; }
    if (lower === 'clear') { setLines([]); return; }
    if (lower === 'hint') {
      if (!level.hintsEnabled) { print('No hints on this level.', 'r'); return; }
      const t = nextTask();
      if (!t) return;
      setHints((h) => h + 1);
      print(`HINT: ${t.hint}`, 'y');
      return;
    }
    const submitMatch = line.match(/^submit\s+(.+)$/i);
    if (submitMatch) {
      if (submitMatch[1].trim() === level.flag) finishWin();
      else strike('Wrong flag. Keep digging.');
      return;
    }

    const t = nextTask();
    if (t && t.match.test(line)) {
      t.output.forEach((l) => print(l));
      if (t.prompt) setPending({ taskId: t.id, prompt: t.prompt });
      else setDone((d) => new Set(d).add(t.id));
      return;
    }

    strike(`command not recognized for this stage. Type help.`);
  }

  function runTask(t: LevelConfig['tasks'][number]) {
    if (!t.cmd) return;
    runCommand(t.cmd);
  }

  return { started, start, done, strikes, timeLeft, won, lost, lines, pending, best, runCommand, runTask, nextTask, hints };
}

function Terminal({ game }: { game: ReturnType<typeof useGame> }) {
  const [val, setVal] = useState('');
  const outRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    outRef.current?.scrollTo({ top: outRef.current.scrollHeight });
  }, [game.lines]);

  return (
    <div className={styles.term}>
      <div className={styles.termBar}><i /><i /><i /><span>attacker@kali: room.thm</span></div>
      <div ref={outRef} className={styles.out}>
        {game.lines.map((l, i) => <div key={i} className={l.cls ? styles[l.cls] : undefined}>{l.text}</div>)}
      </div>
      <form
        className={styles.inForm}
        onSubmit={(e) => { e.preventDefault(); game.runCommand(val); setVal(''); }}
      >
        <span className={styles.ps}>$</span>
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={game.won || game.lost ? 'room closed' : 'type a command'}
          disabled={game.won || game.lost}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </form>
    </div>
  );
}

export default function Play() {
  const rootRef = useRef<HTMLElement>(null);
  useReveal(rootRef);
  const [levelKey, setLevelKey] = useState<'easy' | 'normal' | 'impossible'>('easy');
  const level = LEVELS[levelKey];
  const game = useGame(level);

  function mmss(s: number) {
    const m = Math.floor(s / 60), r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  }

  return (
    <Section ref={rootRef} id="play" wash="accent" index="08 / Play" eyebrow="Play" title="Break into the machine" sub="A tiny TryHackMe-style room. Easy needs no experience — it explains every step.">
      <div className={styles.levelTabs} data-reveal>
        {(['easy', 'normal', 'impossible'] as const).map((k) => (
          <button key={k} type="button" className={`${styles.levelTab} ${levelKey === k ? styles.on : ''}`}
            onClick={() => setLevelKey(k)} data-cursor="Level">
            {LEVELS[k].title}
          </button>
        ))}
      </div>

      <div className={styles.game} data-reveal>
        <div className={styles.side}>
          <h3>{level.title}</h3>
          <span className={styles.tagline}>{level.tagline}</span>
          <p>Target: <b>{level.target}</b> (alias: target)</p>

          {level.timerSec || level.strikesMax ? (
            <div className={styles.meta}>
              {level.timerSec ? <div><i>Time</i><b className={game.timeLeft < 30 ? styles.danger : ''}>{mmss(game.timeLeft)}</b></div> : null}
              {level.strikesMax ? <div><i>Strikes</i><b className={game.strikes >= level.strikesMax - 1 ? styles.danger : ''}>{game.strikes}/{level.strikesMax}</b></div> : null}
            </div>
          ) : null}

          {level.key !== 'impossible' && (
            <div className={styles.tasks}>
              {level.tasks.map((t) => (
                <div key={t.id} className={`${styles.task} ${game.done.has(t.id) ? styles.done : ''}`}>
                  <span className={styles.box} />
                  <div>
                    {t.label}
                    {level.showCommands && game.started && !game.done.has(t.id) && t.id === game.nextTask()?.id && (
                      <div>
                        <button type="button" className={styles.btn} style={{ marginTop: 6, padding: '6px 10px', fontSize: '.78rem' }}
                          onClick={() => game.runTask(t)} data-cursor="Run">Run</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={styles.meta}>
            <div><i>Best</i><b>{game.best !== null ? `${game.best}s` : '–'}</b></div>
            {level.hintsEnabled && <div><i>Hints</i><b>{game.hints}</b></div>}
          </div>

          <div className={styles.actions}>
            <button type="button" className={`${styles.btn} ${styles.primary}`} onClick={game.start} data-magnet data-cursor="Start">
              {game.started ? 'Restart' : 'Start the room'}
            </button>
          </div>
        </div>

        {game.started ? (
          <Terminal game={game} />
        ) : (
          <div className={styles.locked}>
            <h3>Ready when you are</h3>
            <p>Pick a difficulty on the left, then press <b>Start the room</b>. The clock only runs while you play.</p>
          </div>
        )}
      </div>
    </Section>
  );
}
