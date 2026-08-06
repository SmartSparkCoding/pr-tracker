import { cachedFetchText } from './github';

export interface NavItem {
  label: string;
  href: string;
  external: boolean;
}

const NAV_SOURCE_URL =
  'https://raw.githubusercontent.com/SmartSparkCoding/Personal-Website/main/src/components/Navbar.astro';

const SELF_PATTERN = /pr(?:\.jacob)?\.navaratne\.uk|pr-tracker\.vercel\.app/i;

export async function fetchNavItems(): Promise<NavItem[]> {
  const source = await cachedFetchText(NAV_SOURCE_URL);
  if (!source) return defaultNavItems();

  const items = parseNavItems(source);
  return items.length > 0 ? items : defaultNavItems();
}

function parseNavItems(source: string): NavItem[] {
  const items: NavItem[] = [];
  const re = /\{ label:\s*['"]([^'"]+)['"],\s*href:\s*['"]([^'"]+)['"]\s*\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    const [, label, href] = match;
    if (SELF_PATTERN.test(href)) continue;
    const external = !href.startsWith('/');
    items.push({
      label,
      href: external ? href : `https://jacob.navaratne.uk${href}`,
      external,
    });
  }
  return items;
}

function defaultNavItems(): NavItem[] {
  return [
    { label: 'Home', href: 'https://jacob.navaratne.uk', external: true },
    { label: 'About', href: 'https://jacob.navaratne.uk/#about', external: true },
    { label: 'Portfolio', href: 'https://jacob.navaratne.uk/portfolio', external: true },
  ];
}
