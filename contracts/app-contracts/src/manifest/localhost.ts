// `URL` has already normalised the host by the time these run: every spelling of an IPv4
// address is dotted decimal, and an IPv4-mapped IPv6 address is two hex groups.
const LOOPBACK_HOSTS = [
  /^localhost$/,
  /\.localhost$/,
  /^127\.\d+\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^\[::1?\]$/,
  /^\[::ffff:7f[0-9a-f]{2}:[0-9a-f]{1,4}\]$/,
  /^\[::ffff:0:0\]$/,
];

/**
 * A hostname without its trailing dots, which the URL parser keeps, every one of them:
 * `localhost..` is `localhost`. A loop rather than a regular expression, which would take
 * time quadratic in the number of dots on a hostname with many dots before its end.
 */
export function withoutTrailingDots(hostname: string): string {
  let end = hostname.length;
  while (end > 0 && hostname[end - 1] === '.') {
    end -= 1;
  }
  return hostname.slice(0, end);
}

/**
 * Whether a host is the machine itself: `localhost`, or a loopback or unspecified address.
 * Pass `URL.hostname`, so the host is already normalised. Trailing dots are dropped, as
 * `isGhostHost` drops them.
 */
export function isLocalhost(hostname: string): boolean {
  const host = withoutTrailingDots(hostname);
  return LOOPBACK_HOSTS.some((pattern) => pattern.test(host));
}
