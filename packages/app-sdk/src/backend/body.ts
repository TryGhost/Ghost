import { decodeUtf8 } from '@tryghost/app-contracts/identity';

import { readBytes } from '../shared/body.ts';

/**
 * Reads a request's body as UTF-8 text, or `undefined` if it is longer than `maxBytes`. Invalid
 * UTF-8 throws, as the exact text matters to whoever signs it.
 */
export async function readText(request: Request, maxBytes: number): Promise<string | undefined> {
  const bytes = await readBytes(request, maxBytes);
  return bytes && decodeUtf8(bytes);
}

export function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}
