import fs from 'node:fs';
import path from 'node:path';

export interface RepoInfo {
  owner: string;
  repo: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  url: string;
  avatarUrl: string;
}

export interface PrInfo {
  owner: string;
  repo: string;
  repoUrl: string;
  prUrl: string;
  number: number;
  title: string;
  state: 'open' | 'closed';
  merged: boolean;
  mergedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: string | null;
  authorUrl: string | null;
  additions: number;
  deletions: number;
  changedFiles: number;
  comments: number;
}

const CACHE_FILE = new URL('../.astro/github-cache.json', import.meta.url);
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const memoryCache = new Map<string, unknown>();

function readDiskCache(): Record<string, { data: unknown; fetchedAt: number }> {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    }
  } catch {
    // ignore corrupt cache
  }
  return {};
}

function writeDiskCache(cache: Record<string, { data: unknown; fetchedAt: number }>) {
  try {
    const dir = path.dirname(new URL(CACHE_FILE).pathname);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
  } catch {
    // caching is best-effort
  }
}

function cacheKey(url: string): string {
  return `github:${url}`;
}

async function cachedFetchJson<T>(url: string): Promise<T | null> {
  const key = cacheKey(url);
  const now = Date.now();

  if (memoryCache.has(key)) return memoryCache.get(key) as T | null;

  const disk = readDiskCache();
  const hit = disk[key];
  if (hit && now - hit.fetchedAt < CACHE_TTL_MS) {
    memoryCache.set(key, hit.data);
    return hit.data as T | null;
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'pr-tracker',
  };
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) {
      console.warn(`[github] ${res.status} for ${url}`);
      memoryCache.set(key, null);
      return null;
    }
    const data = (await res.json()) as T;
    memoryCache.set(key, data);
    disk[key] = { data, fetchedAt: now };
    writeDiskCache(disk);
    return data;
  } catch (err) {
    console.warn(`[github] request failed for ${url}: ${err}`);
    memoryCache.set(key, null);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function cachedFetchText(url: string): Promise<string | null> {
  const key = cacheKey(url);
  const now = Date.now();

  if (memoryCache.has(key)) {
    const cached = memoryCache.get(key);
    return typeof cached === 'string' ? cached : null;
  }

  const disk = readDiskCache();
  const hit = disk[key];
  if (hit && now - hit.fetchedAt < CACHE_TTL_MS) {
    memoryCache.set(key, hit.data);
    return typeof hit.data === 'string' ? hit.data : null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'pr-tracker' }, signal: controller.signal });
    if (!res.ok) {
      console.warn(`[github] ${res.status} for ${url}`);
      memoryCache.set(key, null);
      return null;
    }
    const text = await res.text();
    memoryCache.set(key, text);
    disk[key] = { data: text, fetchedAt: now };
    writeDiskCache(disk);
    return text;
  } catch (err) {
    console.warn(`[github] request failed for ${url}: ${err}`);
    memoryCache.set(key, null);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function parseRepoLink(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname !== 'github.com') return null;
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
  } catch {
    return null;
  }
}

export function parsePrLink(url: string): { owner: string; repo: string; number: number } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/(?:pull|issues)\/(\d+)/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, ''), number: Number(match[3]) };
}

export async function fetchRepoInfo(url: string): Promise<RepoInfo | null> {
  const parsed = parseRepoLink(url);
  if (!parsed) return null;
  const { owner, repo } = parsed;

  const data = await cachedFetchJson<{
    full_name: string;
    description: string | null;
    language: string | null;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    html_url: string;
    owner: { avatar_url: string };
  }>(`https://api.github.com/repos/${owner}/${repo}`);

  if (!data) return null;
  return {
    owner,
    repo,
    fullName: data.full_name,
    description: data.description,
    language: data.language,
    stars: data.stargazers_count,
    forks: data.forks_count,
    openIssues: data.open_issues_count,
    url: data.html_url,
    avatarUrl: data.owner.avatar_url,
  };
}

export async function fetchPrInfo(url: string): Promise<PrInfo | null> {
  const parsed = parsePrLink(url);
  if (!parsed) return null;
  const { owner, repo, number } = parsed;

  const data = await cachedFetchJson<{
    number: number;
    title: string;
    state: string;
    merged_at: string | null;
    closed_at: string | null;
    created_at: string;
    updated_at: string;
    user: { login: string; html_url: string } | null;
    additions: number;
    deletions: number;
    changed_files: number;
    comments: number;
    html_url: string;
    pull_request?: { merged: boolean } | null;
  }>(`https://api.github.com/repos/${owner}/${repo}/pulls/${number}`);

  if (!data) return null;
  return {
    owner,
    repo,
    repoUrl: `https://github.com/${owner}/${repo}`,
    prUrl: data.html_url,
    number: data.number,
    title: data.title,
    state: data.state === 'open' ? 'open' : 'closed',
    merged: data.pull_request ? data.pull_request.merged : Boolean(data.merged_at),
    mergedAt: data.merged_at,
    closedAt: data.closed_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    author: data.user?.login ?? null,
    authorUrl: data.user?.html_url ?? null,
    additions: data.additions,
    deletions: data.deletions,
    changedFiles: data.changed_files,
    comments: data.comments,
  };
}
