export interface AllowFramingOptions {
  /**
   * The Ghost Admin origins that may frame the page, such as `https://site.example`. Admin is
   * on the site's own origin, or on a separate Admin domain when the site has one. An empty
   * list lets nothing frame the page.
   */
  adminOrigins: readonly string[];
}

/** Reads an origin, refusing anything more, so nothing else can be written into the policy. */
function readOrigin(entry: string): string {
  const url = URL.parse(entry);
  if (
    !url ||
    (url.protocol !== 'https:' && url.protocol !== 'http:') ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    entry.includes('*')
  ) {
    throw new TypeError(`Expected an origin such as https://site.example, not ${entry}`);
  }
  return url.origin;
}

/**
 * A copy of `response` that only the given Ghost Admin origins may frame: its
 * Content-Security-Policy gets a `frame-ancestors` directive, which replaces any it had, and
 * `X-Frame-Options` is dropped, as it would refuse Admin. Use it on the app's pages.
 *
 * The SDK can't tell which sites installed the app, so the origins come from the app's own
 * configuration or its record of where it's installed.
 */
export function allowFraming(response: Response, { adminOrigins }: AllowFramingOptions): Response {
  const origins = adminOrigins.map(readOrigin);
  const directive = `frame-ancestors ${origins.length > 0 ? origins.join(' ') : "'none'"}`;
  const framed = new Response(response.body, response);
  const policy = (framed.headers.get('content-security-policy') ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part && !/^frame-ancestors(?:\s|$)/i.test(part));
  framed.headers.set('content-security-policy', [...policy, directive].join('; '));
  framed.headers.delete('x-frame-options');
  return framed;
}
