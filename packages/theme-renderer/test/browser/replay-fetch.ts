/**
 * Replay fetch over the recorded Content API fixtures
 * (test/browser/fixtures/content-api.json, written by
 * test/integration/record-browser-fixtures.ts).
 *
 * Shared by the worker entry (browser) and the Node guard test
 * (test/integration/fixture-parity.test.ts) — keep this file runtime-neutral:
 * web-standard APIs only, no node: imports.
 *
 * Unknown URLs throw instead of falling through to the network, which keeps
 * both suites provably hermetic.
 */
export type ApiFixtures = Record<string, { status: number; body: string }>;

import errors from '@tryghost/errors';

export function createReplayFetch(fixtures: ApiFixtures): typeof globalThis.fetch {
  return function replayFetch(input) {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const recorded = fixtures[url];
    if (!recorded) {
      // IncorrectUsageError, deliberately NOT NotFoundError: the render
      // pipeline treats API NotFoundErrors as benign route fall-throughs,
      // and a missing fixture must fail the test loudly instead.
      return Promise.reject(
        new errors.IncorrectUsageError({
          message: `No recorded Content API fixture for ${url} — re-record with: node test/integration/record-browser-fixtures.ts`,
        }),
      );
    }
    return Promise.resolve(
      new Response(recorded.body, {
        status: recorded.status,
        headers: { 'content-type': 'application/json' },
      }),
    );
  };
}
