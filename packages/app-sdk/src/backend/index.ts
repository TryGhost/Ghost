/**
 * The SDK for an app's backend: answering Ghost's challenge and serving the signed manifest.
 *
 * Built on web standards only (`Request`, `Response`, `fetch` and WebCrypto), so the same code
 * runs on Cloudflare Workers, Node, Bun and Deno, and inside frameworks such as Hono.
 *
 * ```ts
 * import { env } from 'cloudflare:workers';
 * import { withGhostApp } from '@tryghost/app-sdk/backend';
 *
 * export default withGhostApp({
 *   backendKey: env.GHOST_APP_BACKEND_KEY,
 *   fetch: (request) => env.ASSETS.fetch(request),
 * });
 * ```
 */

export { withGhostApp, type FetchHandler, type GhostAppOptions } from './app.ts';
export {
  CHALLENGE_PATH,
  handleChallenge,
  type BackendKey,
  type HandleChallengeOptions,
} from './challenge.ts';
export { MANIFEST_PATH, serveManifest, type SignedManifest } from './manifest.ts';
