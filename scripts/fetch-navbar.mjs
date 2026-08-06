import { mkdir, writeFile, copyFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_URL =
  'https://raw.githubusercontent.com/SmartSparkCoding/Personal-Website/main/src/components/Navbar.astro';

const DIR = fileURLToPath(new URL('../src/components/generated/', import.meta.url));
const OUT_FILE = path.join(DIR, 'Navbar.astro');
const FALLBACK_FILE = fileURLToPath(new URL('../src/components/Navbar.astro', import.meta.url));

const MAIN_SITE = 'https://jacob.navaratne.uk';
const SELF_PATTERN = /pr(?:\.jacob)?\.navaratne\.uk|pr-tracker\.vercel\.app/i;

function rewriteNavbar(source) {
  const arrayPattern = /const navItems = \[([\s\S]*?)\n\];/;
  const match = source.match(arrayPattern);
  if (match) {
    const kept = match[1]
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('{'))
      .map((line) => {
        const label = line.match(/label:\s*['"]([^'"]+)['"]/)?.[1];
        const href = line.match(/href:\s*['"]([^'"]+)['"]/)?.[1];
        if (!label || !href) return null;
        if (SELF_PATTERN.test(href)) return null;
        const absolute = href.startsWith('http') ? href : `${MAIN_SITE}${href}`;
        return `  { label: '${label}', href: '${absolute}' },`;
      })
      .filter(Boolean)
      .join('\n');
    source = source.replace(arrayPattern, `const navItems = [\n${kept}\n];`);
  } else {
    console.warn('[navbar] could not locate navItems array, using source unchanged');
  }
  source = source.replace(/<a href="\/" class="logo"/, `<a href="${MAIN_SITE}" class="logo"`);
  source = source.replace(/href="#contact"/, `href="${MAIN_SITE}/#contact"`);
  return source;
}

async function fallback() {
  try {
    await mkdir(DIR, { recursive: true });
    await copyFile(FALLBACK_FILE, OUT_FILE);
    console.log('[navbar] using committed fallback');
  } catch (err) {
    console.error(`[navbar] fallback copy failed: ${err}`);
  }
}

async function main() {
  try {
    const res = await fetch(SOURCE_URL, { headers: { 'User-Agent': 'pr-tracker' } });
    if (!res.ok) {
      console.error(`[navbar] GitHub returned ${res.status}`);
      await fallback();
      return;
    }
    const source = await res.text();
    if (!source.includes('nav-container')) {
      console.error('[navbar] unexpected file content');
      await fallback();
      return;
    }
    const rewritten = rewriteNavbar(source);
    await mkdir(DIR, { recursive: true });
    await writeFile(OUT_FILE, rewritten);
    console.log('[navbar] pulled from Personal-Website repo -> src/components/generated/Navbar.astro');
  } catch (err) {
    console.error(`[navbar] fetch failed: ${err}`);
    await fallback();
  }
}

try {
  await access(OUT_FILE);
  console.log('[navbar] already present, skipping fetch');
} catch {
  await main();
}
