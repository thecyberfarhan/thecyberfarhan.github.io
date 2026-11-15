// A completion certificate drawn on a canvas, then wrapped in a one-page PDF for download.
type Cert = { name: string; room: string; level: string; time: string; hints: number; strikes?: number; date: string; tags: string[]; flags: number };

let fonts: Promise<unknown> | null = null;
function fontsReady() {
  // loaded once; redraws while typing should not wait on the network again
  fonts ??= Promise.all([document.fonts.load('400 64px "Instrument Serif"'), document.fonts.load('italic 400 64px "Instrument Serif"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => null);
  return fonts;
}

// a short, stable code from the certificate's contents (decoration, not security)
function code(c: Cert) {
  let h = 2166136261;
  for (const ch of `${c.name}|${c.room}|${c.time}|${c.date}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return 'FH-' + (h >>> 0).toString(36).toUpperCase().padStart(7, '0').slice(0, 7);
}

// one honest line about how the run went
function verdict(c: Cert) {
  if (c.strikes !== undefined) return c.strikes === 0 ? 'Zero strikes. The IDS never knew.' : `${c.strikes} strike${c.strikes === 1 ? '' : 's'}, and still got in.`;
  if (c.hints === 0) return 'No hints used. Not one.';
  return `${c.hints} hint${c.hints === 1 ? '' : 's'} used. Asking for help is a skill too.`;
}

const W = 1600, H = 1130, SCALE = 2;
const INK = '#16181d', RED = '#b4232c', MUTED = '#61656f', PAPER = '#f7f8fa', RULE = '#d3d8df';

export async function drawCertificate(canvas: HTMLCanvasElement, c: Cert) {
  await fontsReady();
  canvas.width = W * SCALE; canvas.height = H * SCALE;
  const x = canvas.getContext('2d')!;
  x.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  const serif = '"Instrument Serif", Georgia, serif', mono = '"JetBrains Mono", ui-monospace, monospace', sans = '"Inter Variable", system-ui, sans-serif';

  // paper, a faint dot grid and a double frame
  x.fillStyle = PAPER; x.fillRect(0, 0, W, H);
  x.fillStyle = '#dfe3e8';
  for (let gy = 96; gy < H - 90; gy += 28) for (let gx = 96; gx < W - 90; gx += 28) { x.beginPath(); x.arc(gx, gy, 1.1, 0, Math.PI * 2); x.fill(); }
  x.fillStyle = PAPER; x.fillRect(220, 150, W - 440, 760);
  x.strokeStyle = INK; x.lineWidth = 3; x.strokeRect(50, 50, W - 100, H - 100);
  x.strokeStyle = RULE; x.lineWidth = 1.5; x.strokeRect(68, 68, W - 136, H - 136);
  // targeting brackets in the corners, like the site's photo
  x.strokeStyle = RED; x.lineWidth = 4;
  ([[90, 90, 1, 1], [W - 90, 90, -1, 1], [90, H - 90, 1, -1], [W - 90, H - 90, -1, -1]] as const).forEach(([cx, cy, sx, sy]) => {
    x.beginPath(); x.moveTo(cx, cy + sy * 46); x.lineTo(cx, cy); x.lineTo(cx + sx * 46, cy); x.stroke();
  });

  // header strip
  x.textAlign = 'left';
  x.fillStyle = INK; x.font = `600 20px ${mono}`; x.fillText('FH · LAB', 130, 140);
  x.fillStyle = MUTED; x.font = `500 16px ${mono}`; x.fillText(`ROOM · ${c.level.toUpperCase()}`, 130, 166);

  x.textAlign = 'center';
  x.fillStyle = RED; x.font = `500 22px ${mono}`;
  x.fillText('C E R T I F I C A T E   O F   C O M P L E T I O N', W / 2, 210);
  x.fillStyle = MUTED; x.font = `400 28px ${sans}`;
  x.fillText('This is to certify that', W / 2, 288);

  const name = c.name.trim().slice(0, 40) || 'An anonymous hacker';
  let size = 112;
  x.font = `italic 400 ${size}px ${serif}`;
  while (x.measureText(name).width > W - 520 && size > 48) { size -= 4; x.font = `italic 400 ${size}px ${serif}`; }
  x.fillStyle = INK; x.fillText(name, W / 2, 404);
  x.strokeStyle = RED; x.lineWidth = 2; x.beginPath(); x.moveTo(W / 2 - 360, 440); x.lineTo(W / 2 + 360, 440); x.stroke();

  x.fillStyle = '#3b3f47'; x.font = `400 30px ${sans}`;
  x.fillText(`captured ${c.flags > 1 ? `all ${c.flags} flags` : 'the flag'} in the practice room`, W / 2, 516);
  x.fillStyle = INK; x.font = `400 78px ${serif}`;
  x.fillText(c.room, W / 2, 604);

  // what the room exercised, as small tags
  if (c.tags.length) {
    x.fillStyle = MUTED; x.font = `500 15px ${mono}`; x.fillText('SKILLS DEMONSTRATED', W / 2, 660);
    x.font = `500 18px ${mono}`;
    const pad = 16, gap = 10;
    const widths = c.tags.map((t) => x.measureText(t).width + pad * 2);
    let cx = W / 2 - (widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1)) / 2;
    c.tags.forEach((t, i) => {
      x.strokeStyle = '#c4cad2'; x.lineWidth = 1.5; x.fillStyle = '#fff';
      x.beginPath(); x.roundRect(cx, 678, widths[i], 38, 19); x.fill(); x.stroke();
      x.fillStyle = INK; x.fillText(t, cx + widths[i] / 2, 703);
      cx += widths[i] + gap;
    });
  }

  // the numbers
  const facts = [['TIME', c.time], ['HINTS', String(c.hints)], ...(c.strikes !== undefined ? [['STRIKES', String(c.strikes)]] : []), ['DATE', c.date]];
  const colW = 240, startX = W / 2 - ((facts.length - 1) * colW) / 2;
  x.strokeStyle = RULE; x.lineWidth = 1;
  x.beginPath(); x.moveTo(startX - colW / 2, 758); x.lineTo(startX + (facts.length - 0.5) * colW, 758); x.stroke();
  facts.forEach(([k, v], i) => {
    const fx = startX + i * colW;
    if (i) { x.beginPath(); x.moveTo(fx - colW / 2, 774); x.lineTo(fx - colW / 2, 850); x.stroke(); }
    x.fillStyle = MUTED; x.font = `500 16px ${mono}`; x.fillText(k, fx, 796);
    x.fillStyle = INK; x.font = `400 40px ${serif}`; x.fillText(v, fx, 842);
  });
  x.fillStyle = RED; x.font = `italic 400 26px ${serif}`;
  x.fillText(verdict(c), W / 2, 896);

  // signature and verification code
  x.textAlign = 'left';
  x.fillStyle = INK; x.font = `italic 400 44px ${serif}`; x.fillText('Farhan Hussain', 140, 978);
  x.strokeStyle = INK; x.lineWidth = 1.5; x.beginPath(); x.moveTo(140, 992); x.lineTo(470, 992); x.stroke();
  x.fillStyle = MUTED; x.font = `400 18px ${sans}`; x.fillText('Room author · thecyberfarhan.github.io/lab', 140, 1020);
  x.textAlign = 'right';
  x.fillStyle = INK; x.font = `600 22px ${mono}`; x.fillText(code(c), W - 140, 978);
  x.fillStyle = MUTED; x.font = `400 16px ${sans}`; x.fillText('Issued by a portfolio mini-game.', W - 140, 1004);
  x.fillText('Not a real certification, sadly. Still bragging rights.', W - 140, 1026);

  // the seal, with its text running round the rim
  x.save();
  x.translate(W - 250, 250);
  x.rotate(-0.12);
  x.fillStyle = RED; x.beginPath(); x.arc(0, 0, 96, 0, Math.PI * 2); x.fill();
  x.strokeStyle = PAPER; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, 84, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.arc(0, 0, 58, 0, Math.PI * 2); x.stroke();
  const rim = ' THECYBERFARHAN · LAB · FLAG CAPTURED ·';
  x.fillStyle = PAPER; x.font = `600 13px ${mono}`; x.textAlign = 'center';
  [...rim].forEach((ch, i) => {
    x.save(); x.rotate((i / rim.length) * Math.PI * 2); x.fillText(ch, 0, -66); x.restore();
  });
  x.font = `400 50px ${serif}`; x.fillText('F', 0, 14);
  x.font = `600 11px ${mono}`; x.fillText('PWNED', 0, 36);
  x.restore();
  return code(c);
}

// A minimal one-page PDF (A4 landscape) holding the certificate as a JPEG. No library needed:
// the format only asks for a few numbered objects and a table of where each one starts.
export async function certificatePdf(canvas: HTMLCanvasElement, title: string): Promise<Blob> {
  const jpeg = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.93));
  if (!jpeg) throw new Error('could not encode the certificate');
  const img = new Uint8Array(await jpeg.arrayBuffer());
  const enc = new TextEncoder();
  const safeTitle = title.replace(/[\\()]/g, '').replace(/[^\x20-\x7e]/g, '').slice(0, 80);
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let len = 0;
  const push = (p: Uint8Array | string) => { const b = typeof p === 'string' ? enc.encode(p) : p; parts.push(b); len += b.length; };
  const obj = (n: number, body: string | (() => void)) => {
    offsets[n] = len;
    push(`${n} 0 obj\n`);
    if (typeof body === 'string') push(body); else body();
    push('\nendobj\n');
  };
  const content = 'q 842 0 0 595 0 0 cm /Im0 Do Q';
  push('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
  obj(4, () => {
    push(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`);
    push(img);
    push('\nendstream');
  });
  obj(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  obj(6, `<< /Title (${safeTitle}) /Author (Farhan Hussain) /Creator (thecyberfarhan.github.io lab) >>`);
  const xref = len;
  push(`xref\n0 7\n0000000000 65535 f \n${offsets.slice(1).map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('')}`);
  push(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts, { type: 'application/pdf' });
}
