import type { APIRoute } from 'astro';
import { writeups, toneOf } from '../../../data/site';
import { ogCardPng } from '../../../lib/og-card';

export function getStaticPaths() {
  return writeups.map((w) => ({
    params: { slug: w.slug },
    props: {
      kicker: `${(w.platform ?? '').toUpperCase()}  ·  WRITEUP`,
      title: w.title,
      summary: w.takeaway || w.summary || '',
      badge: (w.difficulty ?? '').toUpperCase(),
      badgeColor: toneOf(w.difficulty),
    },
  }));
}

export const GET: APIRoute = ({ props }) =>
  new Response(new Uint8Array(ogCardPng(props as any)), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
