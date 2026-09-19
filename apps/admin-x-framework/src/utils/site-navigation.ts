export type NavigationPlacement = 'primary' | 'secondary' | null;
export type PageRoutes = Record<string, string>;
export interface SiteNavigationItem {
  label: string;
  url: string;
  icon?: string;
  visibility?: string;
}
export interface NavigationPage {
  label: string;
  path: string | null;
}

const relativeBase = 'http://__ghost-relative__.invalid';

export function pagePathForSlug(slug: string, pageRoutes: PageRoutes = {}): string | null {
  if (!slug) {
    return null;
  }
  return Object.prototype.hasOwnProperty.call(pageRoutes, slug) ? pageRoutes[slug] : `/${slug}/`;
}

function createMatcher(blogUrl?: string, pageRoutes: PageRoutes = {}) {
  let site: URL | undefined;
  try {
    site = new URL(blogUrl ?? '');
  } catch {
    // Relative navigation still works when the site URL is unavailable.
  }
  const subdir = site?.pathname.replace(/\/+$/, '').toLowerCase() ?? '';
  const pathnameFor = (url: string | null): string | null => {
    if (!url) {
      return null;
    }
    let parsed: URL;
    try {
      parsed = new URL(url, relativeBase);
    } catch {
      return null;
    }
    const relative = parsed.origin === relativeBase;
    if (!relative && parsed.origin !== site?.origin) {
      return null;
    }
    let pathname = (parsed.pathname.replace(/\/+$/, '') || '/').toLowerCase();
    // Stored relative URLs already exclude the install prefix.
    if (!relative && subdir) {
      if (pathname === subdir) {
        return '/';
      }
      if (!pathname.startsWith(`${subdir}/`)) {
        return null;
      }
      pathname = pathname.slice(subdir.length) || '/';
    }
    return pathname;
  };
  const routes = Object.entries(pageRoutes).map(
    ([slug, path]) => [pathnameFor(pagePathForSlug(slug)), pathnameFor(path)] as const,
  );
  const destinations = new Set(routes.map(([, path]) => path));
  // A custom route occupying a slug URL takes precedence over its redirect.
  const redirects = new Map(
    routes.filter(([source, destination]) => source && destination && !destinations.has(source)),
  );
  return (url: string | null) => {
    const path = pathnameFor(url);
    return path ? (redirects.get(path) ?? path) : null;
  };
}

export function getPageNavigationPlacement(
  navigation: SiteNavigationItem[],
  secondaryNavigation: SiteNavigationItem[],
  path: string | null,
  blogUrl?: string,
  pageRoutes?: PageRoutes,
): NavigationPlacement {
  const match = createMatcher(blogUrl, pageRoutes);
  const target = match(path);
  if (!target) {
    return null;
  }
  if (navigation.some((item) => match(item.url) === target)) {
    return 'primary';
  }
  return secondaryNavigation.some((item) => match(item.url) === target) ? 'secondary' : null;
}

// Pure transformation shared by React and Ember. Never mutate cached settings.
export function updatePageNavigation(
  navigation: SiteNavigationItem[],
  secondaryNavigation: SiteNavigationItem[],
  pages: NavigationPage[],
  placement: NavigationPlacement,
  blogUrl?: string,
  pageRoutes?: PageRoutes,
) {
  const match = createMatcher(blogUrl, pageRoutes);
  let primary = navigation;
  let secondary = secondaryNavigation;
  let changed = false;
  for (const page of pages) {
    const target = match(page.path);
    if (!target) {
      continue;
    }
    const matches = (item: SiteNavigationItem) => match(item.url) === target;
    const current = primary.some(matches)
      ? 'primary'
      : secondary.some(matches)
        ? 'secondary'
        : null;
    if (current === placement) {
      continue;
    }
    const existing = [...primary, ...secondary].find(matches);
    primary = primary.filter((item) => !matches(item));
    secondary = secondary.filter((item) => !matches(item));
    changed = true;
    if (placement) {
      const item = existing
        ? { ...existing }
        : { label: page.label || 'Untitled', url: page.path! };
      if (placement === 'primary') {
        primary = [...primary, item];
      } else {
        secondary = [...secondary, item];
      }
    }
  }
  return { navigation: primary, secondaryNavigation: secondary, changed };
}
