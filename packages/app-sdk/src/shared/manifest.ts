// What the backend, the tooling and the Vite plugin agree on about the signed manifest. Free of
// Node and of the contracts' validation, as the backend runs on any platform.

/** Where an app serves its signed manifest by convention, and where the SDK's tooling signs it for. */
export const MANIFEST_PATH = '/ghost-app.json';

/**
 * Stands in for the site's own URL when checking a manifest as Ghost would, which nothing but
 * the site knows: a name that's never any site's, so the rest of the rules apply as Ghost
 * applies them.
 */
export const UNKNOWN_GHOST_URL = 'https://ghost.invalid/';
