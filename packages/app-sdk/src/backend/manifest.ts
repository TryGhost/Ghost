import { SignedManifestSchema, type SignedManifest } from '@tryghost/app-contracts/identity';

export type { SignedManifest };
export { MANIFEST_PATH } from '../shared/manifest.ts';

/**
 * A response that serves the signed manifest, for a backend that doesn't serve it as a static
 * file. Pass the file's text as it is, or the object it holds. An object that isn't a signed
 * manifest, which Ghost would refuse, throws a `TypeError`.
 *
 * Caches may keep it, but must check it's still current each time, so a new manifest reaches
 * Ghost the next time Ghost reads it.
 */
export function serveManifest(signed: SignedManifest | string): Response {
  if (typeof signed !== 'string' && !SignedManifestSchema.safeParse(signed).success) {
    throw new TypeError(
      'Expected a signed manifest, with only protected, payload and signature, or its text',
    );
  }
  return new Response(typeof signed === 'string' ? signed : JSON.stringify(signed), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-cache',
    },
  });
}
