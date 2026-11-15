import type { Room } from '../../data/rooms';
import { drawCertificate, certificatePdf } from './certificate';
import { getRoom, saveRoom } from './state';
import { line } from '../lines';

type Say = (text: string, opts?: { state?: string; gesture?: 'nod' | 'bounce' | 'spin'; ms?: number }) => void;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function initCertificate(room: Room, run: { secs: number; hints: number; strikes?: number; say: Say }) {
  const form = document.getElementById('cert-form') as HTMLFormElement;
  const input = document.getElementById('cert-name') as HTMLInputElement;
  const canvas = document.getElementById('cert') as HTMLCanvasElement;
  const dl = document.getElementById('cert-dl') as HTMLButtonElement;
  const save = getRoom(room.slug);
  if (save.certName) input.value = save.certName;
  let downloads = 0;
  const flags = room.tasks.reduce((n, t) => n + t.questions.filter((q) => q.flag).length, 0);
  const date = (save.doneAt ? new Date(save.doneAt + 'T12:00:00') : new Date()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  // the certificate redraws as the name is typed; drawing is coalesced to one per frame
  let queued = false, saveT = 0;
  const draw = async () => {
    const name = input.value.trim().slice(0, 40);
    await drawCertificate(canvas, {
      name, room: room.name, level: room.level, time: fmt(Math.max(0, Math.round(run.secs))), hints: run.hints, strikes: run.strikes,
      date, tags: room.tags.filter((t) => t !== 'Guided').slice(0, 4), flags: Math.max(1, flags),
    });
    canvas.hidden = false;
    dl.disabled = false;
    clearTimeout(saveT);
    saveT = window.setTimeout(() => { const s = getRoom(room.slug); s.certName = name; saveRoom(room.slug, s); }, 400);
  };
  const schedule = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; draw(); }); };
  input.addEventListener('input', schedule);
  form.onsubmit = (e) => { e.preventDefault(); draw(); input.blur(); };
  draw();

  dl.onclick = async () => {
    downloads += 1;
    run.say(downloads > 2 ? line('downloadAgain', { n: downloads }) : line('download'), { state: downloads > 2 ? 'suspicious' : 'proud', gesture: 'nod', ms: 5500 });
    dl.disabled = true;
    try {
      const pdf = await certificatePdf(canvas, `${room.name} certificate`);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(pdf);
      a.download = `certificate-${room.slug}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } finally { dl.disabled = false; }
  };
  // right-click or long-press "save image as"
  canvas.oncontextmenu = () => { run.say(line('rightClick'), { state: 'curious', ms: 4000 }); };
}
