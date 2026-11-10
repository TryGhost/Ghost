// Characters that end a source in a policy, a directive or a whole policy, and the wildcard.
const UNSAFE_IN_POLICY = /[\s;,'"*]/;

/**
 * An HTTP or HTTPS origin, or `undefined` for anything more or less. The URL parser lets `;` and
 * `,` into a host, so the origin must also read back as itself, and hold nothing that would end
 * a source in a Content-Security-Policy.
 */
export function parseOrigin(entry: string): string | undefined {
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
    return undefined;
  }
  return origin;
}
