import { CHALLENGE_PATH, handleChallenge, type HandleChallengeOptions } from './challenge.ts';
import { allowFraming } from './framing.ts';

/**
 * A fetch handler: the request, then whatever else the platform passes, such as a Worker's `env`
 * and `ctx`.
 */
export type FetchHandler<Args extends unknown[] = []> = (
  request: Request,
  ...args: Args
) => Response | Promise<Response>;

export interface GhostAppOptions<Args extends unknown[] = []> extends HandleChallengeOptions {
  /** The app's own handler, for every request but Ghost's challenge. */
  fetch: FetchHandler<Args>;
  /**
   * The Ghost Admin origins that may frame the app's pages, such as `https://site.example`.
   * Optional: without it, `fetch`'s responses are passed on as they are. With it, each one goes
   * through `allowFraming`.
   */
  adminOrigins?: readonly string[];
}

/**
 * The app's backend: answers Ghost's challenge at `CHALLENGE_PATH` with `handleChallenge`, and
 * passes every other request to `fetch`, with whatever else the platform passes. With
 * `adminOrigins`, `fetch`'s responses also go through `allowFraming`.
 *
 * It returns `{ fetch }`, so a Worker can export it as it is, and Bun can serve it.
 */
export function withGhostApp<Args extends unknown[] = []>({
  fetch,
  adminOrigins,
  ...challenge
}: GhostAppOptions<Args>): { fetch: (request: Request, ...args: Args) => Promise<Response> } {
  return {
    async fetch(request, ...args) {
      if (new URL(request.url).pathname === CHALLENGE_PATH) {
        return handleChallenge(request, challenge);
      }
      const response = await fetch(request, ...args);
      return adminOrigins ? allowFraming(response, { adminOrigins }) : response;
    },
  };
}
