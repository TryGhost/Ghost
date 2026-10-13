import { HELLO_MESSAGE_TYPE } from '@tryghost/app-contracts/bridge';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ADMIN_ORIGIN, FakeAdmin, frame, postToPage, settle, startContext } from './fake-admin.ts';

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

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, '10' as unknown as number])(
    'refuses a timeout of %s',
    async (timeout) => {
      frame();
      const error = await sdk.connect({ timeout }).catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(sdk.GhostAppError);
      expect(error).toMatchObject({ code: 'invalid_argument' });
    },
  );

  it('says hello to the parent and resolves once Admin has started the app', async () => {
    const parent = frame();
    const fake = admin();
    const connecting = sdk.connect();

    expect(parent.postMessage).toHaveBeenCalledWith(
      { type: HELLO_MESSAGE_TYPE, sdk: '0.0.0' },
      '*',
    );

    fake.connect();
    expect(await pending(connecting)).toBe(true);

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

  it('addresses the hello to the embedding origin when the browser tells it', async () => {
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

  it('says hello again until Admin answers', async () => {
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

  it('ignores messages that are not Admin connecting', async () => {
    frame();
    const fake = admin();
    const connecting = sdk.connect();

    postToPage({ source: window, ports: [fake.channel.port2] });
    postToPage({ data: { type: 'something-else' }, ports: [fake.channel.port2] });
    postToPage({ data: 'ghost-app:connect' as never, ports: [fake.channel.port2] });
    postToPage({ data: null as never, ports: [fake.channel.port2] });
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

  it('gives up when Admin does not start the app in time', async () => {
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

  it('gives up, and closes the channel, when Admin connects but never starts', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    frame();
    const fake = admin();
    const connecting = sdk.connect();
    const failed = expect(connecting).rejects.toMatchObject({ code: 'not_connected' });
    fake.connect();

    vi.advanceTimersByTime(10_000);
    await failed;
  });

  it('shares one connection between calls, and tries again after a failure', async () => {
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

  it('refuses a start it does not understand', async () => {
    frame();
    const fake = admin();
    const connecting = sdk.connect();
    const failed = expect(connecting).rejects.toMatchObject({ code: 'not_connected' });
    fake.connect();

    await expect(fake.start({ ...startContext(), theme: { mode: 'system' } })).rejects.toThrow(
      "Ghost started the app with a context this SDK doesn't understand",
    );
    await failed;
  });

  it('answers a second start without starting again', async () => {
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
      'The app has not been started yet',
    );
    await expect(
      fake.thread.imports.themeChanged({ mode: 'dark', accent_color: '#000000' }),
    ).rejects.toThrow('The app has not been started yet');
  });
});
