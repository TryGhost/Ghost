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
 * Whether a host is the machine itself: `localhost`, or a loopback or unspecified address.
 * Pass `URL.hostname`, so the host is already normalised.
 */
export function isLocalhost(hostname: string): boolean {
  const host = hostname.replace(/\.$/, '');
  return LOOPBACK_HOSTS.some((pattern) => pattern.test(host));
}
