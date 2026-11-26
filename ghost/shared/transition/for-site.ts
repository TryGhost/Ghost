import type { Site } from '#support/site';

/**
 * Turns a module that legacy code imports directly into something new code asks
 * for with the site. Today there is one site per process, so the site is not
 * looked at. Callers will not change when that stops being true.
 */
export function forSite<Legacy>(legacy: Legacy): (site: Site) => Legacy {
  return () => legacy;
}
