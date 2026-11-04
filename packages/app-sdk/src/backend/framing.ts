export interface AllowFramingOptions {
  /**
   * The Ghost Admin origins that may frame the page, such as `https://site.example`. Admin is
   * on the site's own origin, or on a separate Admin domain when the site has one. An empty
   * list lets nothing frame the page.
   */
  adminOrigins: readonly string[];
}

// Characters that end a source in a policy, a directive or a whole policy, and the wildcard.
const UNSAFE_IN_POLICY = /[\s;,'"*]/;

/**
 * Reads an origin, refusing anything more, so nothing else can be written into the policy. The
 * URL parser lets `;` and `,` into a host, so the origin must also read back as itself.
 */
function readOrigin(entry: string): string {
  const url = URL.parse(entry);
  const origin = url?.origin;
  if (
    !url ||
    !origin ||
    (url.protocol !== 'https:' && url.protocol !== 'http:') ||
    url.href !== `${origin}/` ||
    URL.parse(origin)?.origin !== origin ||
    UNSAFE_IN_POLICY.test(entry) ||
    UNSAFE_IN_POLICY.test(origin)
  ) {
    throw new TypeError(`Expected an origin such as https://site.example, not ${entry}`);
  }
  return origin;
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
  // Several Content-Security-Policy headers read as one, joined by commas, and each is a policy
  // of its own: every one of them applies. So each loses its own `frame-ancestors`, which would
  // still refuse Admin, and keeps everything else.
  const policies = (framed.headers.get('content-security-policy') ?? '')
    .split(',')
    .map((policy) =>
      policy
        .split(';')
        .map((part) => part.trim())
        .filter((part) => part && !/^frame-ancestors(?:\s|$)/i.test(part))
        .join('; '),
    )
    .filter(Boolean);
  const [first, ...rest] = policies;
  framed.headers.set(
    'content-security-policy',
    [first ? `${first}; ${directive}` : directive, ...rest].join(', '),
  );
  framed.headers.delete('x-frame-options');
  return framed;
}
