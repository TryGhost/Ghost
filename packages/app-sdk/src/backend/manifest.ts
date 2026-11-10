import type { SignedManifest } from '../shared/manifest.ts';

export { MANIFEST_PATH, type SignedManifest } from '../shared/manifest.ts';

/**
 * A response that serves the signed manifest, for a backend that doesn't serve it as a static
 * file. Pass the file's text as it is, or the object it holds.
 *
 * Caches may keep it, but must check it's still current each time, so a new manifest reaches
 * Ghost the next time Ghost reads it.
 */
export function serveManifest(signed: SignedManifest | string): Response {
  return new Response(typeof signed === 'string' ? signed : JSON.stringify(signed), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-cache',
    },
  });
}
