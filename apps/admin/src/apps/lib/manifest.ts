import type { AppManifest, AppNavItem, AppSurface } from '@/apps/types';
import { resolveAppRoute } from '@/apps/lib/bridge';
import { toIconName } from '@/apps/lib/icons';

const ALLOWED_FIELDS = new Set([
  'name',
  'developer',
  'description',
  'icon',
  'color',
  'url',
  'surfaces',
  'nav',
]);
const MAX_NAV_ITEMS = 5;
const MAX_NAV_LABEL_LENGTH = 20;
const SUPPORTED_SURFACES: AppSurface[] = ['page'];
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

export interface ManifestProblem {
  title: string;
  detail: string;
}

export type ManifestResult =
  | { ok: true; manifest: AppManifest }
  | { ok: false; problems: ManifestProblem[] };

function isLocalHost(url: URL) {
  return LOCAL_HOSTNAMES.has(url.hostname) || url.hostname.endsWith('.localhost');
}

/**
 * Apps must be served over HTTPS. Local addresses are allowed over HTTP so a
 * developer can run an app on their own machine.
 */
function checkUrl(value: unknown, field: string, base: string): URL | ManifestProblem {
  if (typeof value !== 'string' || !value.trim()) {
    return { title: `Missing ${field}`, detail: `The manifest needs a “${field}” URL.` };
  }

  let url: URL;
  try {
    url = new URL(value, base);
  } catch {
    return { title: `Invalid ${field}`, detail: `“${value}” isn’t a valid URL.` };
  }

  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocalHost(url))) {
    return {
      title: `${field} must use HTTPS`,
      detail: `“${url.href}” needs to be served over HTTPS.`,
    };
  }

  return url;
}

/**
 * Validates a manifest strictly, so an app can't claim capabilities Ghost
 * hasn't designed. Relative URLs resolve against the manifest's own URL.
 */
export function parseManifest(
  input: unknown,
  manifestUrl: string,
  adminOrigin: string = window.location.origin,
): ManifestResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      problems: [{ title: 'Not a manifest', detail: 'The link didn’t return a JSON object.' }],
    };
  }

  const data = input as Record<string, unknown>;
  const problems: ManifestProblem[] = [];

  for (const key of Object.keys(data)) {
    if (!ALLOWED_FIELDS.has(key)) {
      problems.push({
        title: `Unknown field: ${key}`,
        detail: 'Remove fields Ghost doesn’t support yet.',
      });
    }
  }

  const name = typeof data.name === 'string' ? data.name.trim() : '';
  if (!name) {
    problems.push({ title: 'Missing name', detail: 'The manifest needs a “name”.' });
  } else if (name.length > 60) {
    problems.push({
      title: 'Name is too long',
      detail: 'Keep the name to 60 characters or fewer.',
    });
  }

  const developer = typeof data.developer === 'string' ? data.developer.trim() : '';
  if (data.developer !== undefined && (!developer || developer.length > 60)) {
    problems.push({
      title: 'Invalid developer',
      detail: '“developer” must be a name of 60 characters or fewer.',
    });
  }

  if (data.description !== undefined && typeof data.description !== 'string') {
    problems.push({ title: 'Invalid description', detail: '“description” must be text.' });
  }

  const appUrl = checkUrl(data.url, 'url', manifestUrl);
  if (!(appUrl instanceof URL)) {
    problems.push(appUrl);
  } else if (appUrl.origin === adminOrigin) {
    problems.push({
      title: 'App must run on its own origin',
      detail: 'Apps can’t be served from the same address as Ghost Admin.',
    });
  }

  let icon: string | undefined;
  if (data.icon !== undefined) {
    const iconName = toIconName(data.icon);
    if (iconName) {
      icon = iconName;
    } else {
      problems.push({
        title: 'Unknown icon',
        detail: 'Use a Lucide icon name, like “calendar-days”. See lucide.dev/icons.',
      });
    }
  }

  let color: string | undefined;
  if (data.color !== undefined) {
    if (typeof data.color === 'string' && HEX_COLOR.test(data.color.trim())) {
      color = data.color.trim().toLowerCase();
    } else {
      problems.push({
        title: 'Invalid color',
        detail: 'Use a six-digit hex colour, like “#fa5d00”.',
      });
    }
  }

  const surfaces = data.surfaces;
  if (!Array.isArray(surfaces) || surfaces.length === 0) {
    problems.push({
      title: 'Missing surfaces',
      detail: 'List where the app appears, e.g. “page”.',
    });
  } else {
    for (const surface of surfaces) {
      if (!SUPPORTED_SURFACES.includes(surface as AppSurface)) {
        problems.push({
          title: `Unsupported surface: ${String(surface)}`,
          detail: 'Apps can only add a page to Admin for now.',
        });
      }
    }
  }

  const nav: AppNavItem[] = [];
  if (data.nav !== undefined) {
    if (!Array.isArray(data.nav)) {
      problems.push({ title: 'Invalid nav', detail: '“nav” must be a list of links.' });
    } else {
      if (data.nav.length > MAX_NAV_ITEMS) {
        problems.push({
          title: 'Too many nav links',
          detail: `Keep the nav to ${MAX_NAV_ITEMS} links or fewer.`,
        });
      }
      data.nav.forEach((item: unknown, index) => {
        const link = (item ?? {}) as Record<string, unknown>;
        const label = typeof link.label === 'string' ? link.label.trim() : '';
        const path = resolveAppRoute(link.path);
        if (!label || label.length > MAX_NAV_LABEL_LENGTH) {
          problems.push({
            title: `Invalid nav label (link ${index + 1})`,
            detail: `Use a short label of 1–${MAX_NAV_LABEL_LENGTH} characters, like “Settings”.`,
          });
        }
        if (!path || path === '/') {
          problems.push({
            title: `Invalid nav path (link ${index + 1})`,
            detail:
              'Use a path inside the app, like “/settings”. The app’s name already links home.',
          });
        }
        if (label && path) {
          nav.push({ label, path });
        }
      });
    }
  }

  if (problems.length || !(appUrl instanceof URL)) {
    return { ok: false, problems };
  }

  return {
    ok: true,
    manifest: {
      name,
      ...(developer ? { developer } : {}),
      description: typeof data.description === 'string' ? data.description.trim() : undefined,
      icon,
      ...(color ? { color } : {}),
      url: appUrl.href,
      surfaces: surfaces as AppSurface[],
      ...(nav.length ? { nav } : {}),
    },
  };
}

export type FetchManifestResult = ManifestResult | { ok: false; unreachable: true; detail: string };

export async function fetchManifest(manifestUrl: string): Promise<FetchManifestResult> {
  const checked = checkUrl(manifestUrl, 'manifest', window.location.href);
  if (!(checked instanceof URL)) {
    return { ok: false, problems: [checked] };
  }

  let response: Response;
  try {
    // The manifest lives on the app's own server, not the Admin API.
    // eslint-disable-next-line no-restricted-syntax
    response = await fetch(checked.href, { credentials: 'omit', cache: 'no-store' });
  } catch {
    return { ok: false, unreachable: true, detail: `Couldn’t reach ${checked.host}.` };
  }

  if (!response.ok) {
    return {
      ok: false,
      unreachable: true,
      detail: `${checked.host} responded with ${response.status}.`,
    };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return {
      ok: false,
      problems: [{ title: 'Not a manifest', detail: 'The link didn’t return valid JSON.' }],
    };
  }

  return parseManifest(json, checked.href);
}

/**
 * Who the app is by: the developer's own name when the manifest gives one;
 * otherwise where the app is served from, which Ghost can vouch for.
 */
export function appDeveloper(manifest: AppManifest): string {
  return manifest.developer ?? new URL(manifest.url).host;
}
