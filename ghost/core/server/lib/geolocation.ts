import { isIP } from 'node:net';
import { z } from 'zod';

// got is ESM-only
const got = require('got').default;

// A malformed field is dropped rather than failing the whole lookup
const field = z.string().optional().catch(undefined);

// The fields Ghost reads from a geojs.io lookup; it returns more
const Geolocation = z.object({
  city: field,
  region: field,
  country: field,
  country_code: field,
});

export type Geolocation = z.infer<typeof Geolocation>;

/**
 * Looks an IP address up on geojs.io, a fixed host, so it needs none of
 * request-external's private-network checks. Resolves `undefined` for a
 * missing or malformed address without a request. One attempt with no
 * retries, so a geojs outage delays sign-in by at most the timeout. Rejects
 * when the lookup fails or doesn't answer with an object.
 */
export async function lookupGeolocation(
  ip: string | null | undefined,
): Promise<Geolocation | undefined> {
  if (!ip || !isIP(ip)) {
    return undefined;
  }

  const response: unknown = await got(
    `https://get.geojs.io/v1/ip/geo/${encodeURIComponent(ip)}.json`,
    { timeout: { request: 500 }, retry: { limit: 0 } },
  ).json();
  return Geolocation.parse(response);
}
