import type { APIRoute } from 'astro';
import { writeups } from '../../../data/site';
import { WRITEUP_FOCUS } from '../../../data/og-focus';
import { ogCardImage } from '../../../lib/og-card';

// brighter difficulty accents, legible on the dark card
const TONE: Record<string, string> = {
  'Very Easy': '#7aa0b5', Easy: '#5b8fb8', Medium: '#d08a3a',
  Hard: '#e05b52', Insane: '#d64b63', Challenge: '#c2a84e',
};

export function getStaticPaths() {
  return writeups.map((w) => ({
    params: { slug: w.slug },
    props: {
      platform: w.platform ?? 'TryHackMe',
      title: w.title,
      tag: w.difficulty ?? '',
      tagColor: TONE[w.difficulty ?? ''] ?? '#8b94a3',
      focus: WRITEUP_FOCUS[w.slug] ?? '',
    },
  }));
}

export const GET: APIRoute = async ({ props }) =>
  new Response(new Uint8Array(await ogCardImage(props as any)), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
