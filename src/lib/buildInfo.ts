import { execSync } from 'node:child_process';

function getCommitHash(): string | null {
  try {
    const out = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    return out || null;
  } catch {
    return null;
  }
}

function getCommitUrl(hash: string | null): string | null {
  if (!hash) return null;
  return `https://github.com/SmartSparkCoding/pr-tracker/commit/${hash}`;
}

export interface BuildInfo {
  framework: string;
  commit: string | null;
  commitUrl: string | null;
  deployedAt: string;
}

export function getBuildInfo(): BuildInfo {
  const commit = getCommitHash();
  return {
    framework: 'Astro',
    commit,
    commitUrl: getCommitUrl(commit),
    deployedAt: new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  };
}
