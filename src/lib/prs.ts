import { getCollection, type CollectionEntry } from 'astro:content';
import {
  fetchPrInfo,
  fetchRepoInfo,
  type PrInfo,
  type RepoInfo,
} from './github';

export type PrEntry = CollectionEntry<'prs'>;

export interface EnrichedPr {
  entry: PrEntry;
  slug: string;
  title: string;
  description: string;
  date: string;
  time: string;
  site: string;
  repoLink: string;
  prLink: string;
  tags: string[];
  featured: boolean;
  status: 'open' | 'merged' | 'closed';
  statusSource: 'github' | 'frontmatter' | 'default';
  createdAt: Date;
  github: PrInfo | null;
  repo: RepoInfo | null;
  body: string;
}

function parseDate(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  if (y && m && d) {
    return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
  }
  return new Date(date);
}

function resolveStatus(entry: PrEntry, github: PrInfo | null): EnrichedPr['status'] {
  if (github) {
    if (github.merged) return 'merged';
    if (github.state === 'closed') return 'closed';
    return 'open';
  }
  if (entry.data.status) return entry.data.status;
  return 'open';
}

export async function getEnrichedPrs(): Promise<EnrichedPr[]> {
  const entries = await getCollection('prs');

  const enriched = await Promise.all(
    entries.map(async (entry): Promise<EnrichedPr> => {
      const prLink = entry.data.prLink;
      const repoLink = entry.data.repoLink;
      const [github, repo] = await Promise.all([fetchPrInfo(prLink), fetchRepoInfo(repoLink)]);
      const date = entry.data.date;
      const time = entry.data.time ?? '';

      return {
        entry,
        slug: entry.id.replace(/\.md$/, ''),
        title: github?.title ?? entry.data.title,
        description: entry.data.description,
        date,
        time,
        site: entry.data.site,
        repoLink,
        prLink,
        tags: entry.data.tags,
        featured: entry.data.featured,
        status: resolveStatus(entry, github),
        statusSource: github ? 'github' : entry.data.status ? 'frontmatter' : 'default',
        createdAt: parseDate(date, time),
        github,
        repo,
        body: entry.body,
      };
    }),
  );

  return enriched.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  if (!y || !m || !d) return date;
  return `${d} ${months[(m || 1) - 1]} ${y}`;
}

export function formatDateTime(date: string, time: string): string {
  const formatted = formatDate(date);
  return time ? `${formatted} · ${time}` : formatted;
}

export function formatFullDate(iso: string): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatCount(n: number | undefined | null): string {
  if (n === undefined || n === null) return '0';
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n);
}

export function statusLabel(status: EnrichedPr['status']): string {
  switch (status) {
    case 'merged':
      return 'Merged';
    case 'open':
      return 'Open';
    case 'closed':
      return 'Closed';
  }
}
