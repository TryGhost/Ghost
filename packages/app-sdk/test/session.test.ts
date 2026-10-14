import {
  ARGUMENT_MESSAGES,
  CONNECT_MESSAGE_TYPE,
  type HostExports,
  type StartContext,
} from '@tryghost/app-contracts/bridge';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FakeAdmin,
  frame,
  freshPage,
  hostExports,
  postToPage,
  settle,
  startContext,
} from './fake-admin.ts';

type Sdk = typeof import('../src/index.ts');

const POST_ID = '5ddc9141c35e7700383b2937';

let sdk: Sdk;
let admin: FakeAdmin | undefined;

beforeEach(async () => {
  freshPage();
  vi.resetModules();
  sdk = await import('../src/index.ts');
  if (!document.head) {
    document.documentElement.prepend(document.createElement('head'));
  }
  document.head.innerHTML = '';
  document.title = 'Podcast';
});

afterEach(() => {
  admin?.close();
  admin = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function started(
  exports: Partial<HostExports> = hostExports(),
  context: StartContext = startContext(),
) {
  frame();
  admin = new FakeAdmin(exports);
  const connecting = sdk.connect();
  admin.connect();
  await admin.start(context);
  return { admin, ghost: await connecting, host: exports as ReturnType<typeof hostExports> };
}

function circular(): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  body.self = body;
  return body;
}

describe('fetch', () => {
  it('sends the request Admin takes and rebuilds its answer as a Response', async () => {
    const { ghost, host } = await started();

    const response = await ghost.fetch('/posts/', {
      method: 'post',
      headers: { 'X-Thing': 'yes' },
      body: { posts: [{ title: 'Hello' }] },
    });

    expect(host.fetch).toHaveBeenCalledWith({
      path: '/posts/',
      method: 'POST',
      headers: { 'x-thing': 'yes', 'content-type': 'application/json' },
      body: '{"posts":[{"title":"Hello"}]}',
    });
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
    expect(response.statusText).toBe('OK');
    expect(response.headers.get('content-type')).toBe('application/json');
    await expect(response.json()).resolves.toEqual({ posts: [] });
  });

  it('sends a GET with nothing else by default', async () => {
    const { ghost, host } = await started();
    await ghost.fetch('/posts/?limit=5');
    expect(host.fetch).toHaveBeenCalledWith({ path: '/posts/?limit=5', method: 'GET' });
  });

  it('sends text as it is, and keeps a content type the app set', async () => {
    const { ghost, host } = await started();
    await ghost.fetch('/posts/', {
      method: 'PUT',
      headers: [['Content-Type', 'text/plain']],
      body: 'hello',
    });
    await ghost.fetch('/posts/', {
      method: 'PUT',
      headers: new Headers({ 'Content-Type': 'application/vnd.api+json' }),
      body: [1, 2],
    });
    await ghost.fetch('/posts/', { method: 'DELETE', body: null });

    expect(host.fetch.mock.calls.map(([request]) => request)).toEqual([
      { path: '/posts/', method: 'PUT', headers: { 'content-type': 'text/plain' }, body: 'hello' },
      {
        path: '/posts/',
        method: 'PUT',
        headers: { 'content-type': 'application/vnd.api+json' },
        body: '[1,2]',
      },
      { path: '/posts/', method: 'DELETE' },
    ]);
  });

  it('builds a body-less Response for statuses that have none', async () => {
    const host = hostExports();
    host.fetch.mockResolvedValue({ status: 204, statusText: 'No Content', headers: {}, body: '' });
    const { ghost } = await started(host);

    const response = await ghost.fetch('/posts/1/', { method: 'DELETE' });
    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
  });

  it('passes error statuses on as responses', async () => {
    const host = hostExports();
    host.fetch.mockResolvedValue({
      status: 404,
      statusText: 'Not Found',
      headers: {},
      body: '{"errors":[]}',
    });
    const { ghost } = await started(host);

    const response = await ghost.fetch('/posts/missing/');
    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });

  it.each([
    ['a URL', 'https://site.example/ghost/api/admin/posts/', {}, 'invalid_path'],
    ['a path without a leading slash', 'posts/', {}, 'invalid_path'],
    ['a protocol-relative URL', '//evil.example/posts/', {}, 'invalid_path'],
    ['a path with a backslash', '/\\evil.example/posts/', {}, 'invalid_path'],
    ['a path that is not text', 42 as unknown as string, {}, 'invalid_path'],
    ['an unknown method', '/posts/', { method: 'TRACE' }, 'invalid_argument'],
    ['a body on a GET', '/posts/', { body: 'x' }, 'invalid_argument'],
    ['a body on a HEAD', '/posts/', { method: 'head', body: { a: 1 } }, 'invalid_argument'],
    [
      'a binary body',
      '/posts/',
      { method: 'POST', body: new Blob(['x']) as never },
      'invalid_argument',
    ],
    [
      'a body of a class instance',
      '/posts/',
      { method: 'POST', body: new Date() as never },
      'invalid_argument',
    ],
    [
      'a body that is a number',
      '/posts/',
      { method: 'POST', body: 5 as never },
      'invalid_argument',
    ],
    ['an invalid header name', '/posts/', { headers: { 'bad name': 'x' } }, 'invalid_argument'],
    ['options of null', '/posts/', null as never, 'invalid_argument'],
    ['options that are text', '/posts/', 'POST' as never, 'invalid_argument'],
    ['a method that is not text', '/posts/', { method: 1 as never }, 'invalid_argument'],
    [
      'a body that refers to itself',
      '/posts/',
      { method: 'POST', body: circular() },
      'invalid_argument',
    ],
    [
      'a body holding a BigInt',
      '/posts/',
      { method: 'POST', body: { count: 1n } },
      'invalid_argument',
    ],
    [
      'a body whose toJSON answers nothing',
      '/posts/',
      { method: 'POST', body: { toJSON: () => undefined } },
      'invalid_argument',
    ],
    ['a cookie', '/posts/', { headers: { Cookie: 'x' } }, 'invalid_argument'],
    [
      'an Admin marker',
      '/posts/',
      { headers: [['X-Ghost-Version', '6.0']] as HeadersInit },
      'invalid_argument',
    ],
    [
      'a multipart body',
      '/files/upload/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data; boundary=x' },
        body: '--x--',
      },
      'invalid_argument',
    ],
  ])('refuses %s without asking Admin', async (_label, path, init, code) => {
    const { ghost, host } = await started();
    const error = await ghost.fetch(path, init).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(sdk.GhostAppError);
    expect(error).toMatchObject({ code });
    expect(host.fetch).not.toHaveBeenCalled();
  });

  it('accepts a body of an object without a prototype', async () => {
    const { ghost, host } = await started();
    const body = Object.assign(Object.create(null) as Record<string, unknown>, { a: 1 });
    await ghost.fetch('/posts/', { method: 'POST', body });
    expect(host.fetch).toHaveBeenCalledWith(expect.objectContaining({ body: '{"a":1}' }));
  });

  it.each([
    ['nothing', undefined],
    ['a status out of range', { status: 101, statusText: '', headers: {}, body: '' }],
    [
      'a status that is not a whole number',
      { status: 200.5, statusText: '', headers: {}, body: '' },
    ],
    ['no headers', { status: 200, statusText: '', headers: null, body: '' }],
    ['a body that is not text', { status: 200, statusText: '', headers: {}, body: 1 }],
    ['no status text', { status: 200, headers: {}, body: '' }],
  ])('rejects an answer of %s', async (_label, answer) => {
    const host = hostExports();
    host.fetch.mockResolvedValue(answer as never);
    const { ghost } = await started(host);
    await expect(ghost.fetch('/posts/')).rejects.toMatchObject({
      code: 'rejected',
      message: "Ghost answered with a response this SDK doesn't understand",
    });
  });
});

describe('a refused argument', () => {
  it('is refused in the words Admin uses for it', async () => {
    const { ghost } = await started();
    const refusals: [Promise<unknown>, string][] = [
      [ghost.fetch('posts/'), ARGUMENT_MESSAGES.fetchPath],
      [ghost.fetch('/posts/', { method: 'TRACE' }), ARGUMENT_MESSAGES.fetchMethod],
      [ghost.fetch('/posts/', { body: 'x' }), ARGUMENT_MESSAGES.fetchBody],
      [
        ghost.fetch('/posts/', { headers: { Authorization: 'x' } }),
        // As Admin words it for the app's own spelling of the name.
        ARGUMENT_MESSAGES.reservedHeader('Authorization'),
      ],
      [
        ghost.fetch('/files/upload/', {
          method: 'POST',
          headers: { 'content-type': 'multipart/form-data' },
          body: '',
        }),
        ARGUMENT_MESSAGES.multipart,
      ],
      [ghost.path.set('episodes'), ARGUMENT_MESSAGES.appPath],
      [ghost.path.set('/a', true as never), ARGUMENT_MESSAGES.pathChangeOptions],
      [ghost.open('/posts' as never), ARGUMENT_MESSAGES.place],
    ];
    for (const [refusal, message] of refusals) {
      await expect(refusal).rejects.toMatchObject({ message });
    }
  });
});

describe('when Admin refuses a call', () => {
  it.each([
    ['blocked', 'Apps can’t use /db/'],
    ['invalid_path', 'Expected an Admin API path within the Admin API'],
    ['invalid_argument', 'Expected a method of: GET'],
    ['network_error', 'Couldn’t reach the Admin API: TypeError'],
    ['rejected', 'No: really, no'],
  ])('passes on the code %s that leads its message', async (code, detail) => {
    const host = hostExports();
    host.fetch.mockRejectedValue(new Error(`${code}: ${detail}`));
    const { ghost } = await started(host);

    const error = await ghost.fetch('/db/').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(sdk.GhostAppError);
    expect(error).toMatchObject({ code, message: detail });
    expect(ghost.connected).toBe(true);
  });

  it("rejects with Admin's message when it gives no code", async () => {
    const host = hostExports();
    host.open.mockRejectedValue(new Error('Unknown place'));
    const { ghost } = await started(host);
    await expect(ghost.open({ apps: true })).rejects.toMatchObject({
      code: 'rejected',
      message: 'Unknown place',
    });
  });

  // `not_framed` and `unsupported` are the SDK's own, and `invalid_context` only the page
  // refuses with.
  it.each(['not_framed: Odd', 'unsupported: Odd', 'invalid_context: Odd'])(
    'treats a code Admin does not refuse with as part of the message: %s',
    async (message) => {
      const host = hostExports();
      host.open.mockRejectedValue(new Error(message));
      const { ghost } = await started(host);
      await expect(ghost.open({ apps: true })).rejects.toMatchObject({
        code: 'rejected',
        message,
      });
    },
  );

  it('names the call when Admin gives no message', async () => {
    const host = hostExports();
    host.open.mockRejectedValue('nope');
    const { ghost } = await started(host);
    await expect(ghost.open({ apps: true })).rejects.toMatchObject({
      code: 'rejected',
      message: 'Ghost refused open',
    });
  });

  it("says when this site's Ghost does not have the call, from the calls Admin named", async () => {
    const { titleChanged, pathChanged, fetch } = hostExports();
    const { ghost } = await started({ titleChanged, pathChanged, fetch });
    await expect(ghost.open({ apps: true })).rejects.toMatchObject({
      code: 'unsupported',
      message: "This site's Ghost doesn't support open yet",
    });
    expect(ghost.connected).toBe(true);
  });

  it('reads nothing into the words of the library under the channel', async () => {
    frame();
    const { titleChanged, pathChanged, fetch } = hostExports();
    admin = new FakeAdmin({ titleChanged, pathChanged, fetch });
    const connecting = sdk.connect();
    // Admin names a call it then turns out not to have.
    postToPage({
      data: {
        type: CONNECT_MESSAGE_TYPE,
        exports: ['titleChanged', 'pathChanged', 'fetch', 'open'],
      },
      ports: [admin.channel.port2],
    });
    await admin.start();
    const ghost = await connecting;

    await expect(ghost.open({ apps: true })).rejects.toMatchObject({
      code: 'rejected',
      message: expect.stringContaining("'open'"),
    });
  });
});

describe('path', () => {
  it('tells Admin about the app moving, and remembers where it is', async () => {
    const { ghost, host } = await started();

    await ghost.path.set('/episodes/12');
    await ghost.path.set('/episodes/13', { replace: true });

    expect(host.pathChanged.mock.calls).toEqual([
      ['/episodes/12'],
      ['/episodes/13', { replace: true }],
    ]);
    expect(ghost.path.current).toBe('/episodes/13');
  });

  it('remembers the path spelled as Admin keeps it', async () => {
    const { ghost, host } = await started();

    await ghost.path.set('/search?q=a b');
    expect(host.pathChanged).toHaveBeenLastCalledWith('/search?q=a b');
    expect(ghost.path.current).toBe('/search?q=a%20b');

    await ghost.path.set('/x/../episodes/1');
    expect(ghost.path.current).toBe('/episodes/1');
  });

  it("keeps a path Admin sent while answering the app's move", async () => {
    const host = hostExports();
    host.pathChanged.mockImplementation(async () => {
      await admin?.thread.imports.pathChanged('/inbox');
    });
    const { ghost } = await started(host);

    await ghost.path.set('/a');
    expect(ghost.path.current).toBe('/inbox');
  });

  it('stays where it was when Admin refuses', async () => {
    const host = hostExports();
    host.pathChanged.mockRejectedValue(new Error('Expected a path within the app'));
    const { ghost } = await started(host);

    await expect(ghost.path.set('/a')).rejects.toMatchObject({ code: 'rejected' });
    expect(ghost.path.current).toBe('/');
  });

  it.each([
    ['a path without a leading slash', 'episodes', undefined, 'invalid_path'],
    ['a path that names another host', '//evil.example', undefined, 'invalid_path'],
    ['a path with a backslash', '/\\evil.example', undefined, 'invalid_path'],
    ['a path that is not text', 12 as unknown as string, undefined, 'invalid_path'],
    ['options that are not an object', '/a', true as never, 'invalid_argument'],
  ])('refuses %s without asking Admin', async (_label, path, options, code) => {
    const { ghost, host } = await started();
    await expect(ghost.path.set(path, options)).rejects.toMatchObject({ code });
    expect(host.pathChanged).not.toHaveBeenCalled();
  });

  it("follows Admin's address and tells subscribers", async () => {
    const { admin: fake, ghost, host } = await started();
    const seen: string[] = [];
    const unsubscribe = ghost.onPathChange((path) => seen.push(path));

    await fake.thread.imports.pathChanged('/episodes/1');
    unsubscribe();
    await fake.thread.imports.pathChanged('/episodes/2');

    expect(seen).toEqual(['/episodes/1']);
    expect(ghost.path.current).toBe('/episodes/2');
    expect(host.pathChanged).not.toHaveBeenCalled();
  });

  it('refuses a path from Admin it does not understand', async () => {
    const { admin: fake } = await started();
    for (const path of ['nope', '//evil.example']) {
      await expect(fake.thread.imports.pathChanged(path)).rejects.toThrow(
        "invalid_argument: Ghost sent a path this SDK doesn't understand",
      );
    }
  });
});

describe('open', () => {
  it('asks Admin to open a place', async () => {
    const { ghost, host } = await started();
    await ghost.open({ post: { id: POST_ID } });
    expect(host.open).toHaveBeenCalledWith({ post: { id: POST_ID } });
  });

  it('refuses a place that is not an object without asking Admin', async () => {
    const { ghost, host } = await started();
    await expect(ghost.open('/posts' as never)).rejects.toMatchObject({
      code: 'invalid_argument',
    });
    expect(host.open).not.toHaveBeenCalled();
  });
});

describe('the context', () => {
  it('is handed out as frozen copies, so no part of the page can change it for the rest', async () => {
    const { admin: fake, ghost } = await started();
    await fake.thread.imports.themeChanged({ mode: 'dark', accent_color: '#000000' });

    const writes: [object, string][] = [
      [ghost.site, 'title'],
      [ghost.user, 'role'],
      [ghost.session, 'revision'],
      [ghost.theme, 'mode'],
    ];
    for (const [value, key] of writes) {
      expect(Object.isFrozen(value), key).toBe(true);
      expect(() => {
        (value as Record<string, unknown>)[key] = 'changed';
      }, key).toThrow(TypeError);
    }
    expect(ghost.site.title).toBe('Example');
    expect(ghost.session.revision).toBe(3);
  });
});

describe('theme', () => {
  it("follows Admin's theme and tells subscribers", async () => {
    const { admin: fake, ghost } = await started();
    const seen: string[] = [];
    const unsubscribe = ghost.onThemeChange((theme) => seen.push(theme.mode));

    await fake.thread.imports.themeChanged({ mode: 'dark', accent_color: '#000000' });
    unsubscribe();
    await fake.thread.imports.themeChanged({ mode: 'light', accent_color: '#ffffff' });

    expect(seen).toEqual(['dark']);
    expect(ghost.theme).toEqual({ mode: 'light', accent_color: '#ffffff' });
  });

  it('refuses a theme it does not understand', async () => {
    const { admin: fake } = await started();
    await expect(
      fake.thread.imports.themeChanged({ mode: 'system' as never, accent_color: '#000000' }),
    ).rejects.toThrow("invalid_argument: Ghost sent a theme this SDK doesn't understand");
    await expect(fake.thread.imports.themeChanged(null as never)).rejects.toThrow(
      "invalid_argument: Ghost sent a theme this SDK doesn't understand",
    );
  });

  it('keeps telling the other subscribers when one throws', async () => {
    const rethrown: unknown[] = [];
    vi.stubGlobal('queueMicrotask', (callback: () => void) => {
      try {
        callback();
      } catch (error) {
        rethrown.push(error);
      }
    });
    const { admin: fake, ghost } = await started();
    const seen: string[] = [];
    const failure = new Error('app bug');
    ghost.onThemeChange(() => {
      throw failure;
    });
    ghost.onThemeChange((theme) => seen.push(theme.mode));

    await fake.thread.imports.themeChanged({ mode: 'dark', accent_color: '#000000' });

    expect(seen).toEqual(['dark']);
    expect(rethrown).toEqual([failure]);
  });
});

describe('title', () => {
  it('reports the title at the start and whenever it changes', async () => {
    const { host } = await started();
    expect(host.titleChanged.mock.calls).toEqual([['Podcast']]);

    document.title = 'Episodes';
    await settle();
    // Swapping the element for one with the same text is no change.
    const title = document.createElement('title');
    title.textContent = 'Episodes';
    document.head.replaceChildren(title);
    await settle();
    (document.querySelector('title') as HTMLTitleElement).textContent = '  Episode 12 ';
    await settle();

    expect(host.titleChanged.mock.calls).toEqual([['Podcast'], ['Episodes'], ['Episode 12']]);
  });

  it('reports at most 200 characters, without splitting a character', async () => {
    document.title = `${'a'.repeat(199)}😀 and more`;
    const { host } = await started();
    expect(host.titleChanged).toHaveBeenCalledWith('a'.repeat(199));

    document.title = 'b'.repeat(250);
    await settle();
    expect(host.titleChanged).toHaveBeenLastCalledWith('b'.repeat(200));
  });

  it('drops the characters Admin refuses in a title, rather than the title', async () => {
    document.title = '\u200Fפודקאסט\u200F · \u202EEpisodes';
    const { host } = await started();
    expect(host.titleChanged).toHaveBeenCalledWith('פודקאסט · Episodes');
  });

  it('watches a title outside a head, in a page that has none', async () => {
    document.head.remove();
    const title = document.createElement('title');
    title.textContent = 'Headless';
    document.documentElement.prepend(title);
    const { host } = await started();

    title.textContent = 'Still headless';
    await settle();
    expect(host.titleChanged.mock.calls).toEqual([['Headless'], ['Still headless']]);
    title.remove();
  });

  it("leaves Admin's title alone on a Ghost without titles", async () => {
    const observe = vi.spyOn(MutationObserver.prototype, 'observe');
    const { fetch, pathChanged, open } = hostExports();
    const { ghost } = await started({ fetch, pathChanged, open });
    expect(observe).not.toHaveBeenCalled();
    expect(ghost.connected).toBe(true);
  });

  it('keeps watching after Admin refuses a title', async () => {
    const host = hostExports();
    host.titleChanged.mockRejectedValueOnce(new Error('invalid_argument: Expected a title'));
    const { ghost } = await started(host);
    document.title = 'Episodes';
    await settle();
    expect(host.titleChanged.mock.calls).toEqual([['Podcast'], ['Episodes']]);
    expect(ghost.connected).toBe(true);
  });

  it('stops watching once the session has ended', async () => {
    const { admin: fake, ghost, host } = await started();
    const ended = new Promise((resolve) => {
      ghost.onSessionEnd(resolve);
    });
    fake.close();
    await ended;

    document.title = 'Episodes';
    await settle();
    expect(host.titleChanged).toHaveBeenCalledTimes(1);
  });
});

describe('the end of the session', () => {
  it('rejects pending and later calls with one session_ended error', async () => {
    const host = hostExports();
    host.fetch.mockReturnValue(new Promise(() => {}));
    const { admin: fake, ghost } = await started(host);
    const ends: unknown[] = [];
    ghost.onSessionEnd((error) => ends.push(error));

    const pendingFetch = ghost.fetch('/posts/').catch((caught: unknown) => caught);
    await settle();
    fake.close();

    const error = await pendingFetch;
    expect(error).toBeInstanceOf(sdk.GhostAppError);
    expect(error).toMatchObject({ code: 'session_ended' });
    expect(ends).toEqual([error]);
    expect(ghost.connected).toBe(false);
    await expect(ghost.open({ apps: true })).rejects.toBe(error);
    await expect(ghost.path.set('/a')).rejects.toBe(error);
  });

  it('tells a subscriber that comes late straight away', async () => {
    const { admin: fake, ghost } = await started();
    await new Promise((resolve) => {
      ghost.onSessionEnd(resolve);
      fake.close();
    });

    const late = vi.fn();
    const unsubscribe = ghost.onSessionEnd(late);
    unsubscribe();
    await settle();
    expect(late).toHaveBeenCalledWith(expect.objectContaining({ code: 'session_ended' }));
  });

  it('does not tell a subscriber that left', async () => {
    const { admin: fake, ghost } = await started();
    const left = vi.fn();
    ghost.onSessionEnd(left)();
    await new Promise((resolve) => {
      ghost.onSessionEnd(resolve);
      fake.close();
    });
    expect(left).not.toHaveBeenCalled();
  });

  it('ends when a message cannot be read', async () => {
    const { admin: fake, ghost } = await started();
    // The port is Node's, which wants Node's own Event rather than jsdom's; `emit` makes one.
    (fake.channel.port2 as unknown as { emit(type: string): void }).emit('messageerror');
    expect(ghost.connected).toBe(false);
  });

  it('ends when Admin says the session has ended', async () => {
    const host = hostExports();
    host.fetch.mockRejectedValue(new Error('session_ended: The installation changed'));
    const { ghost } = await started(host);

    await expect(ghost.fetch('/posts/')).rejects.toMatchObject({
      code: 'session_ended',
      message: 'The installation changed',
    });
    expect(ghost.connected).toBe(false);
    await expect(ghost.open({ apps: true })).rejects.toMatchObject({
      message: 'The installation changed',
    });
  });
});
