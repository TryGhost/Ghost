import { extract } from '@extractus/oembed-extractor';
import errors from '@tryghost/errors';
import { OembedData } from './oembed-schema';
import { USER_AGENT } from './user-agent';

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Fetches oEmbed data for a URL from its allowlisted provider endpoint
 *
 * `fetch` should be `externalRequest.fetch` so requests get SSRF protection
 */
export async function extractOembed(
  url: string,
  { fetch, signal }: { fetch: Fetch; signal?: AbortSignal },
): Promise<OembedData> {
  const fetcher = (requestUrl: string) =>
    fetch(requestUrl, { headers: { 'user-agent': USER_AGENT }, signal });

  const result = OembedData.safeParse(await extract(url, {}, fetcher));
  if (!result.success) {
    throw new errors.ValidationError({
      message: 'Provider returned an invalid oEmbed response',
      context: url,
      err: result.error,
    });
  }

  // extractor tags results with its lookup method; keep card payloads unchanged
  delete result.data.method;

  return result.data;
}
