/**
 * The SDK for an app's backend: answering Ghost's challenge, serving the signed manifest,
 * letting Ghost Admin frame the app's pages, and calling the Admin API.
 *
 * Built on web standards only (`Request`, `Response`, `fetch` and WebCrypto), so the same code
 * runs on Cloudflare Workers, Node, Bun and Deno, and inside frameworks such as Hono.
 *
 * ```ts
 * import { CHALLENGE_PATH, handleChallenge } from '@tryghost/app-sdk/backend';
 *
 * export default {
 *   fetch(request, env) {
 *     if (new URL(request.url).pathname === CHALLENGE_PATH) {
 *       return handleChallenge(request, { backendKey: env.GHOST_APP_BACKEND_KEY });
 *     }
 *     return env.ASSETS.fetch(request);
 *   },
 * };
 * ```
 */

export {
  createAdminApiClient,
  createAdminApiToken,
  type AdminApiClient,
  type AdminApiClientOptions,
  type AdminApiTokenOptions,
} from './admin-api.ts';
export {
  CHALLENGE_PATH,
  handleChallenge,
  type BackendKey,
  type HandleChallengeOptions,
} from './challenge.ts';
export { allowFraming, type AllowFramingOptions } from './framing.ts';
export { MANIFEST_PATH, serveManifest, type SignedManifest } from './manifest.ts';
