import { HELLO_MESSAGE_TYPE, START_TIMEOUT_MS } from '@tryghost/app-contracts/bridge';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ADMIN_ORIGIN,
  FakeAdmin,
  frame,
  freshPage,
  postToPage,
  settle,
  startContext,
} from './fake-admin.ts';
import { SDK_VERSION } from '../src/version.ts';

type Sdk = typeof import('../src/index.ts');

let sdk: Sdk;
const admins: FakeAdmin[] = [];

function admin() {
  const fake = new FakeAdmin();
  admins.push(fake);
  return fake;
}

// `connect` shares one connection per page, so each test loads the SDK afresh.
beforeEach(async () => {
  freshPage();
  vi.resetModules();
  sdk = await import('../src/index.ts');
});

afterEach(() => {
  for (const fake of admins.splice(0)) {
    fake.close();
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete (window.location as { ancestorOrigins?: unknown }).ancestorOrigins;
});

function pending(promise: Promise<unknown>): Promise<boolean> {
  return Promise.race([promise.then(() => false), settle().then(() => true)]);
}

describe('connect', () => {
  it('refuses to run outside a frame', async () => {
    await expect(sdk.connect()).rejects.toMatchObject({
      name: 'GhostAppError',
      code: 'not_framed',
    });
  });

  it.each([
    0,
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    // setTimeout would treat it as 0, and time out immediately.
    2 ** 31,
    '10' as unknown as number,
  ])('refuses a timeout of %s', async (timeout) => {
    frame();
    const error = await sdk.connect({ timeout }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(sdk.GhostAppError);
    expect(error).toMatchObject({ code: 'invalid_argument' });
  });

  it('waits as long as setTimeout can', async () => {
    frame();
    const fake = admin();
    const connecting = sdk.connect({ timeout: 2 ** 31 - 1 });
    fake.connect();
    await fake.start();
    await expect(connecting).resolves.toBeDefined();
  });

  it.each([null, 'fast', 10])('refuses options of %s', async (options) => {
    frame();
    await expect(sdk.connect(options as never)).rejects.toMatchObject({
      name: 'GhostAppError',
      code: 'invalid_argument',
    });
  });

  it('sends a hello to the parent and resolves once Admin has started the app', async () => {
    const parent = frame();
    const fake = admin();
    const connecting = sdk.connect();

    expect(parent.postMessage).toHaveBeenCalledWith(
      {
        type: HELLO_MESSAGE_TYPE,
        sdk: SDK_VERSION,
        document: expect.stringMatching(/^[0-9a-z]+-[0-9a-z]+$/),
      },
      '*',
    );

    fake.connect();
    expect(await pending(connecting)).toBe(true);

    // Admin loads the page at its path, so the page is already there.
    window.history.replaceState(null, '', '/episodes/12');
    const context = startContext({ path: '/episodes/12' });
    await fake.start(context);
    const ghost = await connecting;

    expect(ghost.site).toEqual(context.site);
    expect(ghost.user).toEqual(context.user);
    expect(ghost.theme).toEqual(context.theme);
    expect(ghost.session).toEqual({ revision: 3 });
    expect(ghost.path.current).toBe('/episodes/12');
    expect(ghost.connected).toBe(true);
  });

  it('sends the hello to the embedding origin when the browser exposes it', async () => {
    Object.defineProperty(window.location, 'ancestorOrigins', {
      value: [ADMIN_ORIGIN],
      configurable: true,
    });
    const parent = frame();
    const fake = admin();
    const connecting = sdk.connect();

    expect(parent.postMessage).toHaveBeenCalledWith(expect.anything(), ADMIN_ORIGIN);

    // An answer from any other origin is not Admin's.
    fake.connect({ origin: 'https://elsewhere.example' });
    expect(await pending(fake.start())).toBe(true);

    const other = admin();
    other.connect();
    await other.start();
    await expect(connecting).resolves.toMatchObject({ connected: true });
  });

  it('falls back to any origin when the embedding origin is opaque', () => {
    Object.defineProperty(window.location, 'ancestorOrigins', {
      value: ['null'],
      configurable: true,
    });
    const parent = frame();
    sdk.connect({ timeout: 50 }).catch(() => {});
    expect(parent.postMessage).toHaveBeenCalledWith(expect.anything(), '*');
  });

  it('repeats the hello until Admin answers', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const parent = frame();
    const fake = admin();
    const connecting = sdk.connect();

    vi.advanceTimersByTime(750);
    expect(parent.postMessage).toHaveBeenCalledTimes(4);

    fake.connect();
    vi.advanceTimersByTime(1000);
    expect(parent.postMessage).toHaveBeenCalledTimes(4);

    await fake.start();
    await expect(connecting).resolves.toBeDefined();
  });

  it('sends the same document ID in every hello, including when connecting again', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
    const parent = frame();
    const failed = expect(sdk.connect({ timeout: 600 })).rejects.toMatchObject({
      code: 'not_connected',
    });
    vi.advanceTimersByTime(600);
    await failed;
    sdk.connect({ timeout: 100 }).catch(() => {});
    vi.advanceTimersByTime(100);

    const documents = parent.postMessage.mock.calls.map(
      ([hello]) => (hello as { document: string }).document,
    );
    expect(documents.length).toBeGreaterThan(3);
    expect(new Set(documents).size).toBe(1);

    // A new document, as after a reload, sends a new ID, even within the same millisecond.
    freshPage();
    vi.resetModules();
    const reloaded: Sdk = await import('../src/index.ts');
    reloaded.connect({ timeout: 100 }).catch(() => {});
    const [hello] = parent.postMessage.mock.lastCall ?? [];
    expect((hello as { document: string }).document).not.toBe(documents[0]);
    vi.advanceTimersByTime(100);
  });

  it('refuses to connect a second copy of the SDK in the page', async () => {
    const parent = frame();
    const fake = admin();
    const connecting = sdk.connect();
    vi.resetModules();
    const other: Sdk = await import('../src/index.ts');

    const error = await other.connect().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(other.GhostAppError);
    expect(error).toMatchObject({ code: 'duplicate_sdk' });
    // Only the first copy sends a hello, and it still connects.
    expect(parent.postMessage).toHaveBeenCalledTimes(1);
    expect(sdk.connect()).toBe(connecting);
    fake.connect();
    await fake.start();
    await expect(connecting).resolves.toBeDefined();
  });

  it('keeps the page claimed by the first copy after its connection fails', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
    const parent = frame();
    const failed = expect(sdk.connect({ timeout: 100 })).rejects.toMatchObject({
      code: 'not_connected',
    });
    vi.advanceTimersByTime(100);
    await failed;
    vi.resetModules();
    const other: Sdk = await import('../src/index.ts');

    await expect(other.connect()).rejects.toMatchObject({ code: 'duplicate_sdk' });
    const hellos = parent.postMessage.mock.calls.length;
    sdk.connect().catch(() => {});
    expect(parent.postMessage).toHaveBeenCalledTimes(hellos + 1);
    vi.advanceTimersByTime(START_TIMEOUT_MS);
  });

  it('ignores messages that are not a connect from Admin', async () => {
    frame();
    const fake = admin();
    const connecting = sdk.connect();

    postToPage({ source: window, ports: [fake.channel.port2] });
    postToPage({ data: { type: 'something-else' }, ports: [fake.channel.port2] });
    postToPage({ data: 'ghost-app:connect' as never, ports: [fake.channel.port2] });
    postToPage({ data: null as never, ports: [fake.channel.port2] });
    // A connect that doesn't name Admin's exports.
    postToPage({ data: { type: 'ghost-app:connect' }, ports: [fake.channel.port2] });
    postToPage({
      data: { type: 'ghost-app:connect', exports: 'open' },
      ports: [fake.channel.port2],
    });
    postToPage({ ports: [] });
    expect(await pending(fake.start())).toBe(true);

    const real = admin();
    real.connect();
    await real.start();
    await expect(connecting).resolves.toBeDefined();
  });

  it('binds to the first Admin that connects and ignores any later one', async () => {
    frame();
    const first = admin();
    const second = admin();
    const connecting = sdk.connect();

    first.connect();
    second.connect();
    await first.start();
    const ghost = await connecting;

    expect(await pending(second.start())).toBe(true);
    await ghost.open({ apps: true });
    expect(first.exports.open).toHaveBeenCalledWith({ apps: true });
    expect(second.exports.open).not.toHaveBeenCalled();
  });

  it('times out when Admin does not start the app in time', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
    const parent = frame();
    const connecting = sdk.connect({ timeout: 1000 });
    const failed = expect(connecting).rejects.toMatchObject({ code: 'not_connected' });

    vi.advanceTimersByTime(1000);
    await failed;

    const hellos = parent.postMessage.mock.calls.length;
    vi.advanceTimersByTime(1000);
    expect(parent.postMessage).toHaveBeenCalledTimes(hellos);
  });

  it('times out and closes the channel when Admin connects but never starts the app', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    frame();
    const fake = admin();
    const closed = new Promise((resolve) => {
      fake.channel.port1.addEventListener('close', resolve);
    });
    const connecting = sdk.connect();
    const failed = expect(connecting).rejects.toMatchObject({ code: 'not_connected' });
    fake.connect();

    // By default, the same time Admin gives the page.
    vi.advanceTimersByTime(START_TIMEOUT_MS);
    await failed;
    vi.useRealTimers();
    // Admin's end of the port sees it close, so Admin can't start a page that has timed out.
    expect(await pending(closed)).toBe(false);
  });

  it('shares one connection between calls, and retries after a failure', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    frame();
    const first = sdk.connect({ timeout: 100 });
    expect(sdk.connect()).toBe(first);
    const failed = expect(first).rejects.toMatchObject({ code: 'not_connected' });
    vi.advanceTimersByTime(100);
    await failed;
    vi.useRealTimers();

    const fake = admin();
    const second = sdk.connect();
    expect(second).not.toBe(first);
    fake.connect();
    await fake.start();
    await expect(second).resolves.toBeDefined();
  });

  // Admin answers each document only once, so the first connection Admin answers is the
  // page's only one.
  it('rejects every call once the session has ended, with the error it ended with', async () => {
    const parent = frame();
    const first = admin();
    const connecting = sdk.connect();
    first.connect();
    await first.start();
    const ghost = await connecting;
    const ended = new Promise((resolve) => {
      ghost.onSessionEnd(resolve);
    });
    first.close();
    const error = await ended;

    const hellos = parent.postMessage.mock.calls.length;
    await expect(sdk.connect()).rejects.toBe(error);
    expect(error).toMatchObject({ code: 'session_ended' });
    expect(parent.postMessage).toHaveBeenCalledTimes(hellos);
    expect(ghost.connected).toBe(false);
  });

  it('rejects every call once a connection Admin answered has failed', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
    const parent = frame();
    const fake = admin();
    const connecting = sdk.connect({ timeout: 100 });
    const failed = expect(connecting).rejects.toMatchObject({ code: 'not_connected' });
    fake.connect();
    vi.advanceTimersByTime(100);
    await failed;

    const hellos = parent.postMessage.mock.calls.length;
    await expect(sdk.connect()).rejects.toMatchObject({ code: 'not_connected' });
    vi.advanceTimersByTime(1000);
    expect(parent.postMessage).toHaveBeenCalledTimes(hellos);
  });

  it('refuses a start context it cannot read', async () => {
    frame();
    const fake = admin();
    const connecting = sdk.connect();
    const failed = expect(connecting).rejects.toMatchObject({
      code: 'invalid_context',
      message: "Ghost started the app with a context this SDK doesn't understand",
    });
    fake.connect();

    // Admin gets the reason, encoded the same way as its own refusals.
    await expect(fake.start({ ...startContext(), theme: { mode: 'system' } })).rejects.toThrow(
      "invalid_context: Ghost started the app with a context this SDK doesn't understand",
    );
    await failed;
  });

  it('resolves a second start without starting again', async () => {
    frame();
    const fake = admin();
    const connecting = sdk.connect();
    fake.connect();
    await fake.start();
    const ghost = await connecting;

    await fake.start(startContext({ path: '/elsewhere' }));
    expect(ghost.path.current).toBe('/');
  });

  it('fails when the channel closes before the app has started', async () => {
    frame();
    const fake = admin();
    const connecting = sdk.connect();
    fake.connect();
    fake.close();

    await expect(connecting).rejects.toMatchObject({ code: 'session_ended' });
  });

  it("refuses Admin's other calls before the start", async () => {
    frame();
    const fake = admin();
    sdk.connect().catch(() => {});
    fake.connect();

    await expect(fake.thread.imports.pathChanged('/x')).rejects.toThrow(
      'invalid_context: Ghost has not started the app yet',
    );
    await expect(
      fake.thread.imports.themeChanged({ mode: 'dark', accent_color: '#000000' }),
    ).rejects.toThrow('invalid_context: Ghost has not started the app yet');
  });
});
