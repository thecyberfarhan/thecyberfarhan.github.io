import type { APIRoute } from 'astro';
import { syncedProjects } from '../../../data/site';
import { ogCardImage } from '../../../lib/og-card';

const KIND: Record<string, string> = { Original: 'TOOL', Fork: 'FORK', 'Field note': 'NOTE' };

export function getStaticPaths() {
  return syncedProjects.map((p) => ({
    params: { slug: p.slug },
    props: {
      kicker: `OPEN SOURCE  ·  ${KIND[p.kind] ?? 'PROJECT'}`,
      title: p.name,
      summary: p.tagline || '',
      badge: (p.language ? String(p.language) : 'OSS').toUpperCase(),
      badgeColor: '#b4232c',
    },
  }));
}

export const GET: APIRoute = async ({ props }) =>
  new Response(new Uint8Array(await ogCardImage(props as any)), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
