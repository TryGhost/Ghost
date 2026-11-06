import { z } from 'zod';

/**
 * An absolute `http://` or `https://` URL. Parsed with `new URL()`, as Ghost's
 * own URL helpers do, so anything this rejects they would already throw on.
 */
export function httpUrl(params: Parameters<typeof z.url>[0] = {}) {
  return z.url({
    protocol: /^https?$/,
    error: 'Must be a full URL starting with http:// or https://',
    ...(typeof params === 'string' ? { error: params } : params),
  });
}
