// @vitest-environment node
import type dns from 'node:dns';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { describe, expect, it } from 'vitest';

import { createLocalhostFetch, lookupLocalhostNames } from '../src/tooling/localhost.ts';

type Answer = [Error | null, ...unknown[]];

/**
 * A lookup that answers each name from `answers`, recording the names it was asked. Asked for
 * every address, as Node's connections ask, it gives the one it has in a list.
 */
function fakeLookup(answers: Record<string, Answer>) {
  const asked: string[] = [];
  const lookup = ((
    hostname: string,
    options: dns.LookupOptions,
    callback: (...a: unknown[]) => void,
  ) => {
    asked.push(hostname);
    const [error, address, family] = answers[hostname] ?? [notFound(hostname)];
    if (error) {
      return callback(error);
    }
    callback(null, ...(options.all ? [[{ address, family }]] : [address, family]));
  }) as typeof dns.lookup;
  return { lookup, asked };
}

const notFound = (hostname: string) =>
  Object.assign(new Error(`getaddrinfo ENOTFOUND ${hostname}`), { code: 'ENOTFOUND' });

function lookUp(lookup: typeof dns.lookup, hostname: string) {
  return new Promise<Answer>((resolve) => {
    lookup(hostname, {}, (...answer) => resolve(answer as Answer));
  });
}

describe('lookupLocalhostNames', () => {
  const localhost: Answer = [null, '127.0.0.1', 4];

  it("looks up a name under .localhost the system doesn't know as localhost", async () => {
    const { lookup, asked } = fakeLookup({ localhost });
    expect(await lookUp(lookupLocalhostNames(lookup), 'my-app.localhost')).toEqual(localhost);
    expect(asked).toEqual(['my-app.localhost', 'localhost']);
  });

  it('keeps what the system answers, as from a hosts file', async () => {
    const elsewhere: Answer = [null, '10.0.0.2', 4];
    const { lookup, asked } = fakeLookup({ 'my-app.localhost': elsewhere, localhost });
    expect(await lookUp(lookupLocalhostNames(lookup), 'my-app.localhost')).toEqual(elsewhere);
    expect(asked).toEqual(['my-app.localhost']);
  });

  it('knows a name under .localhost in any case, with trailing dots', async () => {
    const { lookup } = fakeLookup({ localhost });
    expect(await lookUp(lookupLocalhostNames(lookup), 'My-App.LOCALHOST..')).toEqual(localhost);
  });

  it("gives the system's error when localhost fails too", async () => {
    const [error] = await lookUp(lookupLocalhostNames(fakeLookup({}).lookup), 'my-app.localhost');
    expect(error?.message).toContain('my-app.localhost');
  });

  it('leaves other names to the system', async () => {
    const { lookup, asked } = fakeLookup({ localhost });
    const [error] = await lookUp(lookupLocalhostNames(lookup), 'my-app.example');
    expect(error?.message).toContain('my-app.example');
    expect(asked).toEqual(['my-app.example']);
  });

  it('takes no options, as dns.lookup does', async () => {
    const { lookup } = fakeLookup({ localhost });
    const answer = await new Promise((resolve) => {
      lookupLocalhostNames(lookup)('my-app.localhost', (...found) => resolve(found));
    });
    expect(answer).toEqual(localhost);
  });
});

describe('createLocalhostFetch', () => {
  it('reaches a local server on a name the system does not know, under that name', async () => {
    const server = createServer((req, res) => res.end(req.headers.host));
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    try {
      const { port } = server.address() as AddressInfo;
      const fetchFn = createLocalhostFetch(
        fakeLookup({ localhost: [null, '127.0.0.1', 4] }).lookup,
      );
      const response = await fetchFn(`http://my-app.localhost:${port}/`);
      expect(await response.text()).toBe(`my-app.localhost:${port}`);
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
  });
});
