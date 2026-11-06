import dns from 'node:dns';

import { Agent, fetch as undiciFetch } from 'undici';

/**
 * Whether a hostname is a name under `.localhost`, such as `my-app.localhost`, which is always
 * the machine itself (RFC 6761), with any number of trailing dots, as the URL parser keeps them.
 */
export function isUnderLocalhost(hostname: string): boolean {
  return /\.localhost\.*$/i.test(hostname);
}

/**
 * Wraps a DNS lookup so a name under `.localhost` the system doesn't know is looked up as
 * `localhost`, as Ghost in development does. Browsers send every such name to the machine, but
 * the resolvers of Windows, of Linux without systemd-resolved, and of slim containers don't
 * know them.
 */
export function lookupLocalhostNames(lookup: typeof dns.lookup): typeof dns.lookup {
  return ((hostname: string, options: unknown, callback: unknown) => {
    // Called with options or without, as `dns.lookup` is.
    const [opts, done] = (typeof options === 'function' ? [{}, options] : [options, callback]) as [
      dns.LookupOptions,
      (error: Error | null, ...found: unknown[]) => void,
    ];
    if (!isUnderLocalhost(hostname)) {
      return lookup(hostname, opts, done);
    }
    // The system first, so a name it maps elsewhere, in a hosts file say, still goes there.
    lookup(hostname, opts, (error, ...found) => {
      if (!error) {
        return done(null, ...found);
      }
      // Whatever the error: offline, it's EAI_AGAIN rather than ENOTFOUND, yet `localhost`
      // still resolves from the hosts file.
      lookup('localhost', opts, (localhostError, ...onLocalhost) => {
        // The system's error names the host that was asked for.
        done(localhostError ? error : null, ...(localhostError ? [] : onLocalhost));
      });
    });
  }) as typeof dns.lookup;
}

// Through `dns.lookup` as it is when called, as Node's own requests do.
const systemLookup = ((...args: Parameters<typeof dns.lookup>) =>
  dns.lookup(...args)) as typeof dns.lookup;

/**
 * A fetch that reaches names under `.localhost` on any system. Node's own fetch can't take
 * another DNS lookup, so it's undici's, which Node's is built on. Only the lookup changes: the
 * request still names the host it was made to.
 */
export function createLocalhostFetch(lookup: typeof dns.lookup = systemLookup): typeof fetch {
  const dispatcher = new Agent({ connect: { lookup: lookupLocalhostNames(lookup) } });
  // Undici's types are its own, but its fetch takes and gives the same things.
  return ((input: Parameters<typeof fetch>[0], init?: RequestInit) =>
    undiciFetch(input as never, { ...(init as object), dispatcher })) as unknown as typeof fetch;
}
