import type { APIRoute } from 'astro';
import { syncedProjects } from '../../../data/site';
import { PROJECT_FOCUS } from '../../../data/og-focus';
import { ogCardImage } from '../../../lib/og-card';

const KIND: Record<string, string> = { Original: 'Tool', Fork: 'Fork', 'Field note': 'Note' };

// fall back to a trimmed tagline when a project has no hand-written focus
const shortTagline = (t?: string) => {
  if (!t) return '';
  const head = String(t).split(':')[0].split(/(?<=[.!?])\s/)[0];
  return head.length > 52 ? head.slice(0, 52).replace(/\s+\S*$/, '') + '…' : head;
};

export function getStaticPaths() {
  return syncedProjects.map((p) => ({
    params: { slug: p.slug },
    props: {
      platform: `Open source · ${KIND[p.kind] ?? 'Project'}`,
      title: p.name,
      tag: p.language ? String(p.language) : 'OSS',
      tagColor: '#e05b52',
      focus: PROJECT_FOCUS[p.slug] ?? shortTagline(p.tagline),
    },
  }));
}

export const GET: APIRoute = async ({ props }) =>
  new Response(new Uint8Array(await ogCardImage(props as any)), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
