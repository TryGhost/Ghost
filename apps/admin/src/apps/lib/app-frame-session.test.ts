import { ThreadMessagePort } from '@quilted/threads';
import {
  type AppExports,
  HELLO_MESSAGE_TYPE,
  type HostExports,
  type StartContext,
} from '@tryghost/app-contracts/bridge';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type AppFrameSession,
  type AppFrameSessionOptions,
  MAX_SHORT_LIVED,
  SHORT_LIVED_MS,
  createAppFrameSession,
} from './app-frame-session';
import type { AdminApiFetch } from './bridge-fetch';
import { appFrameTimeouts } from './frame';

const ORIGIN = 'https://podcast.example.com';

const context = (overrides: Partial<StartContext> = {}): StartContext => ({
  site: { url: 'https://site.example/', title: 'Example', timezone: 'Etc/UTC', locale: 'en' },
  user: { id: 'user-1', role: 'Owner' },
  theme: { mode: 'light', accent_color: '#ff5500' },
  session: { revision: 0 },
  path: '/',
  ...overrides,
});

/** Lets messages in flight on the channel land. */
const settle = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 10);
  });

/**
 * A document in an app's frame, as far as Admin can see one: the page's side of the channel,
 * which answers with `app`, which a spec can hold back. Like the SDK, it takes the first
 * connect it's sent and ignores the rest. `host` is Admin's side, as the page calls it.
 */
function fakeDocument() {
  const id = crypto.randomUUID().replaceAll('-', '');
  const app = {
    start: vi.fn<AppExports['start']>(async () => {}),
    themeChanged: vi.fn<AppExports['themeChanged']>(async () => {}),
    pathChanged: vi.fn<AppExports['pathChanged']>(async () => {}),
  };
  let thread: ThreadMessagePort<HostExports, AppExports> | undefined;
  return {
    id,
    app,
    connect(port: MessagePort) {
      if (thread) {
        return;
      }
      thread = new ThreadMessagePort<HostExports, AppExports>(port, { exports: app });
      port.start();
    },
    get host() {
      if (!thread) {
        throw new Error('Not connected');
      }
      return thread.imports;
    },
  };
}

/**
 * A frame holding an app's page, as far as Admin can see one: a window that Admin posts the
 * connect message to, and that says hello, and an element that says when it has loaded a
 * document. `app` and `host` are the current document's (see `fakeDocument`).
 */
function fakeFrame() {
  let document = fakeDocument();
  const contentWindow = {
    postMessage: vi.fn((_message: unknown, _origin: string, transfer: Transferable[] = []) => {
      document.connect(transfer[0] as MessagePort);
    }),
  };
  const element = Object.assign(new EventTarget(), { contentWindow });
  return {
    element: element as unknown as HTMLIFrameElement,
    contentWindow,
    get app() {
      return document.app;
    },
    get host() {
      return document.host;
    },
    /** Says hello from the page, as its SDK does once loaded, naming the current document. */
    hello(origin = ORIGIN, id = document.id) {
      const event = new MessageEvent('message', {
        data: { type: HELLO_MESSAGE_TYPE, sdk: 'test', document: id },
        origin,
      });
      Object.defineProperty(event, 'source', { value: contentWindow });
      window.dispatchEvent(event);
    },
    /** The current document has finished loading, as the frame's `load` says. */
    loaded() {
      element.dispatchEvent(new Event('load'));
    },
    /** Replaces the document, as a reload or navigation does. Answers the one it replaced. */
    navigate() {
      const previous = document;
      document = fakeDocument();
      return previous;
    },
  };
}

type FakeFrame = ReturnType<typeof fakeFrame>;

describe('createAppFrameSession', () => {
  let session: AppFrameSession;
  let admin: { context: StartContext };
  const navigate = vi.fn<AppFrameSessionOptions['navigate']>(() => true);
  const open = vi.fn();
  const fetchAdminApi = vi.fn<AdminApiFetch>();
  const previousTimeout = appFrameTimeouts.ready;

  beforeEach(() => {
    admin = { context: context() };
    session = createAppFrameSession({
      surfaceOrigin: ORIGIN,
      context: () => admin.context,
      fetchAdminApi,
      navigate,
      open,
    });
  });

  afterEach(() => {
    session.dispose();
    appFrameTimeouts.ready = previousTimeout;
    vi.useRealTimers();
    vi.clearAllMocks();
    fetchAdminApi.mockReset();
  });

  /** The number of the `index`th move Admin made to follow the app, as its location carries. */
  const moveOf = (index: number): number => navigate.mock.calls[index][1].move;

  /** Has the page set its title over a channel Admin has let go of, which changes nothing. */
  async function callUnheard(frame: Pick<FakeFrame, 'host'>, title: string) {
    frame.host.titleChanged(title).catch(() => {});
    await settle();
    expect(session.getState().title).not.toBe(title);
  }

  /** A frame attached to the session, as mounting it does, whose page has started. */
  async function started(): Promise<FakeFrame> {
    const frame = fakeFrame();
    session.attach(frame.element);
    frame.hello();
    await vi.waitFor(() => expect(session.getState().status).toBe('ready'));
    return frame;
  }

  it('stays loading, so hidden, until the app has started', async () => {
    let finishStarting!: () => void;
    const frame = fakeFrame();
    frame.app.start.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishStarting = resolve;
        }),
    );
    session.attach(frame.element);
    expect(session.getState().status).toBe('loading');

    frame.hello();
    await vi.waitFor(() => expect(frame.app.start).toHaveBeenCalledWith(admin.context));
    await settle();
    expect(session.getState().status).toBe('loading');

    finishStarting();
    await vi.waitFor(() => expect(session.getState().status).toBe('ready'));
  });

  it('starts the app with Admin as it is when the page connects', async () => {
    const frame = fakeFrame();
    session.attach(frame.element);
    admin.context = context({ path: '/episodes/12' });

    frame.hello();

    await vi.waitFor(() =>
      expect(frame.app.start).toHaveBeenCalledWith(context({ path: '/episodes/12' })),
    );
  });

  it('ignores a hello from another origin', async () => {
    const frame = fakeFrame();
    session.attach(frame.element);

    frame.hello('https://elsewhere.example');
    await settle();

    expect(frame.contentWindow.postMessage).not.toHaveBeenCalled();
  });

  it('fails a page that doesn’t start in time, and tells whoever listens', () => {
    vi.useFakeTimers();
    const listener = vi.fn();
    session.subscribe(listener);
    session.attach(fakeFrame().element);

    vi.advanceTimersByTime(appFrameTimeouts.ready - 1);
    expect(session.getState().status).toBe('loading');
    vi.advanceTimersByTime(1);

    expect(session.getState().status).toBe('failed');
    expect(listener).toHaveBeenCalled();
  });

  it('leaves a started app alone once its time to start is up', async () => {
    appFrameTimeouts.ready = 50;
    await started();

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 80);
    });

    expect(session.getState().status).toBe('ready');
  });

  it('loads the page again in a new frame on retry, with the full time to start', async () => {
    vi.useFakeTimers();
    session.attach(fakeFrame().element);
    vi.advanceTimersByTime(appFrameTimeouts.ready);
    const failed = session.getState();
    expect(failed.status).toBe('failed');
    session.attach(null);
    vi.useRealTimers();

    session.restart();

    const retried = session.getState();
    expect(retried).toMatchObject({ status: 'loading', title: undefined, attempt: 1 });
    expect(retried.startedAt.getTime()).toBeGreaterThanOrEqual(failed.startedAt.getTime());
    await started();
  });

  it('shows the page’s title, and forgets it when the page loads again', async () => {
    const frame = await started();

    await frame.host.titleChanged('Episodes');
    expect(session.getState().title).toBe('Episodes');

    session.restart();
    expect(session.getState().title).toBeUndefined();
  });

  it('starts a new document in a started page’s frame in place, once it says hello', async () => {
    let finishStarting!: () => void;
    const frame = await started();
    await frame.host.titleChanged('Episodes');
    admin.context = context({ path: '/episodes/12' });

    // A form post, say, whose result is a document of its own.
    const old = frame.navigate();
    frame.app.start.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishStarting = resolve;
        }),
    );
    frame.hello();

    await vi.waitFor(() => expect(frame.app.start).toHaveBeenCalledWith(admin.context));
    expect(session.getState()).toMatchObject({ status: 'loading', title: undefined, attempt: 0 });
    finishStarting();
    await vi.waitFor(() =>
      expect(session.getState()).toMatchObject({ status: 'ready', attempt: 0 }),
    );
    await callUnheard(old, 'Old');
    await frame.host.titleChanged('Saved');
    expect(session.getState().title).toBe('Saved');
  });

  it('ends the calls of a document that gave way to another', async () => {
    const frame = await started();
    fetchAdminApi.mockImplementation(() => new Promise(() => {}));
    const request = frame.host.fetch({ path: '/posts/' });
    await vi.waitFor(() => expect(fetchAdminApi).toHaveBeenCalled());
    const [, signal] = fetchAdminApi.mock.calls[0];

    frame.navigate();
    frame.hello();

    await expect(request).rejects.toThrow('session_ended: The app’s session ended');
    expect(signal.aborted).toBe(true);
    await vi.waitFor(() => expect(session.getState().status).toBe('ready'));
  });

  it('loads the page again when a new document refuses to start', async () => {
    const frame = await started();

    frame.navigate();
    frame.app.start.mockRejectedValue(new Error('invalid_context: Expected a site'));
    frame.hello();

    await vi.waitFor(() =>
      expect(session.getState()).toMatchObject({ status: 'loading', attempt: 1 }),
    );
  });

  it('keeps a started page that says hello again, as its SDK can before it hears back', async () => {
    const frame = await started();

    // Sent before Admin's answer reached the page, and heard after the app started.
    frame.hello();
    await settle();

    expect(session.getState()).toMatchObject({ status: 'ready', attempt: 0 });
    expect(frame.contentWindow.postMessage).toHaveBeenCalledTimes(1);
    await frame.host.titleChanged('Episodes');
    expect(session.getState().title).toBe('Episodes');
  });

  it('starts the app once when it says hello again while starting', async () => {
    const frame = fakeFrame();
    frame.app.start.mockImplementation(() => settle());
    session.attach(frame.element);

    frame.hello();
    frame.hello();

    await vi.waitFor(() => expect(session.getState().status).toBe('ready'));
    expect(session.getState().attempt).toBe(0);
    expect(frame.contentWindow.postMessage).toHaveBeenCalledTimes(1);
    expect(frame.app.start).toHaveBeenCalledTimes(1);
    await frame.host.titleChanged('Episodes');
    expect(session.getState().title).toBe('Episodes');
  });

  it('starts the page that loaded while the last one was starting, in the time left', async () => {
    vi.useFakeTimers();
    const frame = fakeFrame();
    // The first document never starts: it reloads before it can.
    frame.app.start.mockImplementation(() => new Promise<void>(() => {}));
    session.attach(frame.element);
    frame.hello();
    await vi.advanceTimersByTimeAsync(appFrameTimeouts.ready / 2);

    frame.navigate();
    frame.hello();

    await vi.waitFor(() => expect(session.getState().status).toBe('ready'));
    expect(session.getState().attempt).toBe(0);
    expect(frame.app.start).toHaveBeenCalledWith(admin.context);
  });

  it('starts the latest of the documents that replace one starting in place', async () => {
    const frame = await started();
    frame.navigate();
    frame.app.start.mockImplementation(() => new Promise<void>(() => {}));
    frame.hello();
    await vi.waitFor(() => expect(frame.app.start).toHaveBeenCalled());

    // Reloaded before it could start.
    const reloaded = frame.navigate();
    frame.hello();

    await vi.waitFor(() =>
      expect(session.getState()).toMatchObject({ status: 'ready', attempt: 0 }),
    );
    await callUnheard(reloaded, 'Gone');
    await frame.host.titleChanged('Saved');
    expect(session.getState().title).toBe('Saved');
  });

  it('ignores a late hello from a document that has given way', async () => {
    const frame = fakeFrame();
    frame.app.start.mockImplementation(() => new Promise<void>(() => {}));
    session.attach(frame.element);
    frame.hello();
    const first = frame.navigate();
    frame.hello();
    await vi.waitFor(() => expect(session.getState().status).toBe('ready'));

    frame.hello(ORIGIN, first.id);
    await settle();

    expect(session.getState()).toMatchObject({ status: 'ready', attempt: 0 });
    expect(frame.contentWindow.postMessage).toHaveBeenCalledTimes(2);
    await frame.host.titleChanged('Episodes');
    expect(session.getState().title).toBe('Episodes');
  });

  it('fails a page that keeps reloading while it starts, once its time is up', async () => {
    vi.useFakeTimers();
    const frame = fakeFrame();
    session.attach(frame.element);
    for (let load = 0; load < 20; load += 1) {
      frame.navigate();
      frame.app.start.mockImplementation(() => new Promise<void>(() => {}));
      frame.hello();
    }

    await vi.advanceTimersByTimeAsync(appFrameTimeouts.ready);

    expect(session.getState().status).toBe('failed');
  });

  it('waits for a new document a started page’s frame loads to say hello, and starts it', async () => {
    const frame = await started();
    // Its own load, which can come after it started, is no news.
    frame.loaded();
    await settle();
    expect(session.getState()).toMatchObject({ status: 'ready', attempt: 0 });

    const left = frame.navigate();
    frame.loaded();

    expect(session.getState()).toMatchObject({ status: 'loading', attempt: 0 });
    await callUnheard(left, 'Gone');
    frame.hello();
    await vi.waitFor(() =>
      expect(session.getState()).toMatchObject({ status: 'ready', attempt: 0 }),
    );
  });

  it('loads the page again when a new document its frame loads doesn’t start in time', async () => {
    const frame = await started();
    frame.loaded();
    vi.useFakeTimers();

    // Navigated anywhere, say to an origin that never says hello.
    frame.navigate();
    frame.loaded();
    vi.advanceTimersByTime(appFrameTimeouts.ready - 1);
    expect(session.getState()).toMatchObject({ status: 'loading', attempt: 0 });
    vi.advanceTimersByTime(1);

    expect(session.getState()).toMatchObject({ status: 'loading', attempt: 1 });
  });

  it('loads the page again when a started page’s frame loads one of Admin’s own', async () => {
    const frame = fakeFrame();
    session.attach(frame.element);
    // Loaded before it connected, so the next load is the first since.
    frame.loaded();
    frame.hello();
    await vi.waitFor(() => expect(session.getState().status).toBe('ready'));

    frame.navigate();
    // Admin can read a document on its own origin.
    Object.assign(frame.element, { contentDocument: {} });
    frame.loaded();

    expect(session.getState()).toMatchObject({ status: 'loading', attempt: 1 });
  });

  describe('a page that keeps bringing documents that don’t stay', () => {
    /** Has the started page in `frame` leave for Admin's own origin, which Admin can read. */
    const leave = (frame: FakeFrame) => {
      frame.navigate();
      Object.assign(frame.element, { contentDocument: {} });
      frame.loaded();
    };

    /** Has the started page in `frame` reload itself, and waits for the new one to start. */
    const reload = async (frame: FakeFrame) => {
      frame.navigate();
      frame.hello();
      await vi.waitFor(() => expect(session.getState().status).toBe('ready'));
    };

    it('is called unresponsive when it reloads itself as soon as it starts', async () => {
      const frame = await started();
      for (let count = 1; count <= MAX_SHORT_LIVED; count += 1) {
        await reload(frame);
      }

      frame.navigate();
      frame.hello();

      expect(session.getState()).toMatchObject({ status: 'failed', attempt: 0 });
      await settle();
      expect(frame.contentWindow.postMessage).toHaveBeenCalledTimes(MAX_SHORT_LIVED + 1);
    });

    it('is called unresponsive when it leaves as soon as it starts, until Try again', async () => {
      for (let attempt = 1; attempt <= MAX_SHORT_LIVED; attempt += 1) {
        leave(await started());
        expect(session.getState()).toMatchObject({ status: 'loading', attempt });
      }

      leave(await started());

      expect(session.getState()).toMatchObject({ status: 'failed', attempt: MAX_SHORT_LIVED });
      // Try again starts the count over.
      session.restart();
      for (let attempt = MAX_SHORT_LIVED + 2; attempt <= 2 * MAX_SHORT_LIVED + 1; attempt += 1) {
        leave(await started());
        expect(session.getState()).toMatchObject({ status: 'loading', attempt });
      }
    });

    it('counts the documents it starts in place and the loads afresh together', async () => {
      const frame = await started();
      for (let count = 1; count < MAX_SHORT_LIVED; count += 1) {
        await reload(frame);
      }
      leave(frame);
      expect(session.getState()).toMatchObject({ status: 'loading', attempt: 1 });

      leave(await started());

      expect(session.getState()).toMatchObject({ status: 'failed', attempt: 1 });
    });

    it('is never stopped while each document stays a while', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      const frame = await started();
      // A publisher going through a server-rendered app, a page every few seconds.
      for (let count = 1; count <= 3 * MAX_SHORT_LIVED; count += 1) {
        vi.setSystemTime(Date.now() + SHORT_LIVED_MS);
        await reload(frame);
      }
      // A document that stays a while starts the count over.
      for (let count = 1; count <= MAX_SHORT_LIVED; count += 1) {
        await reload(frame);
      }
      vi.setSystemTime(Date.now() + SHORT_LIVED_MS);
      await reload(frame);
      for (let count = 1; count <= MAX_SHORT_LIVED; count += 1) {
        await reload(frame);
      }

      expect(session.getState()).toMatchObject({ status: 'ready', attempt: 0 });
    });

    it('is loaded again each time it leaves after staying a while', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      for (let attempt = 1; attempt <= 2 * MAX_SHORT_LIVED; attempt += 1) {
        const frame = await started();
        vi.setSystemTime(Date.now() + SHORT_LIVED_MS);
        leave(frame);
        expect(session.getState()).toMatchObject({ status: 'loading', attempt });
      }
    });
  });

  it('keeps a page reached by a redirect in script once it has started', async () => {
    const frame = fakeFrame();
    session.attach(frame.element);
    // The frame's first document loads, and sends it on to the app's page in script.
    frame.loaded();
    frame.navigate();
    frame.hello();
    await vi.waitFor(() => expect(session.getState().status).toBe('ready'));

    // The app's page finishes loading after it started.
    frame.loaded();
    await settle();

    expect(session.getState()).toMatchObject({ status: 'ready', attempt: 0 });
  });

  it('follows the app’s route without telling it back where it went', async () => {
    const frame = await started();

    await frame.host.pathChanged('/episodes/12', { replace: true });
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/episodes/12', {
      replace: true,
      move: moveOf(0),
    });
    // Admin follows, which moves its address within the app to where the app already is.
    session.pathChanged('/episodes/12', moveOf(0));
    await settle();
    expect(frame.app.pathChanged).not.toHaveBeenCalled();

    // Back, to where the app no longer is: that it hears about.
    session.pathChanged('/');
    await vi.waitFor(() => expect(frame.app.pathChanged).toHaveBeenCalledExactlyOnceWith('/'));
  });

  it('follows routes the app moves through quickly to the last, telling it nothing back', async () => {
    const frame = await started();

    // Away and back again before Admin has followed either.
    await Promise.all([frame.host.pathChanged('/login'), frame.host.pathChanged('/')]);
    expect(navigate.mock.calls).toEqual([
      ['/login', { replace: undefined, move: moveOf(0) }],
      ['/', { replace: undefined, move: moveOf(0) + 1 }],
    ]);
    // Admin arrives at each in turn, the route the app has left included.
    session.pathChanged('/login', moveOf(0));
    session.pathChanged('/', moveOf(1));
    await settle();
    expect(frame.app.pathChanged).not.toHaveBeenCalled();

    // Then moves on its own, which the app hears about.
    session.pathChanged('/episodes');
    await vi.waitFor(() =>
      expect(frame.app.pathChanged).toHaveBeenCalledExactlyOnceWith('/episodes'),
    );
  });

  it('follows the app to its last route when Admin skips one it moved through', async () => {
    const frame = await started();

    await Promise.all([
      frame.host.pathChanged('/a'),
      frame.host.pathChanged('/b', { replace: true }),
    ]);
    // Only the last is rendered.
    session.pathChanged('/b', moveOf(1));
    await settle();
    expect(frame.app.pathChanged).not.toHaveBeenCalled();

    // Back, to the route Admin skipped: Admin moving on its own now, which the app hears.
    session.pathChanged('/a', moveOf(0));
    await vi.waitFor(() => expect(frame.app.pathChanged).toHaveBeenCalledExactlyOnceWith('/a'));
  });

  it('follows moves a render folds into one that ends where Admin was, and hears Back after', async () => {
    const frame = await started();

    // An auth guard's bounce: away and back before Admin has rendered either.
    await Promise.all([frame.host.pathChanged('/login'), frame.host.pathChanged('/')]);
    // Both commit as one location, the last move's, on the route Admin was already on.
    session.pathChanged('/', moveOf(1));
    await settle();
    expect(frame.app.pathChanged).not.toHaveBeenCalled();

    // Back, to the entry the first move made: Admin moving on its own, which the app hears.
    session.pathChanged('/login', moveOf(0));
    await vi.waitFor(() => expect(frame.app.pathChanged).toHaveBeenCalledExactlyOnceWith('/login'));
  });

  it('tells a new document of a route Admin was still headed for when it connected', async () => {
    const frame = await started();
    await frame.host.pathChanged('/episodes');

    // A new document starts before Admin has arrived, where Admin still is.
    frame.navigate();
    frame.hello();
    await vi.waitFor(() => expect(frame.app.start).toHaveBeenCalledWith(admin.context));
    await vi.waitFor(() => expect(session.getState().status).toBe('ready'));
    session.pathChanged('/episodes', moveOf(0));

    await vi.waitFor(() =>
      expect(frame.app.pathChanged).toHaveBeenCalledExactlyOnceWith('/episodes'),
    );
  });

  it('tells the app where Admin stays when Admin doesn’t follow it', async () => {
    const frame = await started();
    // The publisher is on their way out of the app.
    navigate.mockReturnValueOnce(false);

    await frame.host.pathChanged('/episodes');

    await vi.waitFor(() => expect(frame.app.pathChanged).toHaveBeenCalledExactlyOnceWith('/'));
    // Nothing for Admin to catch up with: a move of its own there is news to the app.
    session.pathChanged('/episodes');
    await vi.waitFor(() => expect(frame.app.pathChanged).toHaveBeenLastCalledWith('/episodes'));
  });

  it('doesn’t move Admin to the route it is already on', async () => {
    const frame = await started();

    await frame.host.pathChanged('/');

    expect(navigate).not.toHaveBeenCalled();
  });

  it('tells the app of a theme it doesn’t have yet, once', async () => {
    const frame = await started();
    const dark = { mode: 'dark', accent_color: '#ff5500' } as const;

    session.themeChanged(admin.context.theme);
    session.themeChanged(dark);
    session.themeChanged({ ...dark });

    await vi.waitFor(() => expect(frame.app.themeChanged).toHaveBeenCalledExactlyOnceWith(dark));
  });

  it('tells a page nothing before it has connected', async () => {
    const frame = fakeFrame();
    session.attach(frame.element);

    session.pathChanged('/episodes');
    session.themeChanged({ mode: 'dark', accent_color: '#000000' });
    admin.context = context({ path: '/episodes' });
    frame.hello();
    await vi.waitFor(() => expect(session.getState().status).toBe('ready'));

    expect(frame.app.pathChanged).not.toHaveBeenCalled();
    expect(frame.app.themeChanged).not.toHaveBeenCalled();
  });

  it('opens a place the app asks for', async () => {
    const frame = await started();

    await frame.host.open({ post: { id: '5ddc9141c35e7700383b2937' } });

    expect(open).toHaveBeenCalledExactlyOnceWith({ post: { id: '5ddc9141c35e7700383b2937' } });
  });

  it('makes the app’s request, checked, with a signal that ends with the session', async () => {
    const frame = await started();
    fetchAdminApi.mockResolvedValue({ status: 200, statusText: 'OK', headers: {}, body: '{}' });

    await expect(frame.host.fetch({ path: '/posts/' })).resolves.toMatchObject({ status: 200 });

    const [request, signal] = fetchAdminApi.mock.calls[0];
    expect(request).toEqual({ path: '/posts/' });
    expect(signal.aborted).toBe(false);
    session.dispose();
    expect(signal.aborted).toBe(true);
  });

  it('refuses a request that sets a header only Admin sets, without making it', async () => {
    const frame = await started();

    await expect(
      frame.host.fetch({ path: '/posts/', headers: { Authorization: 'Ghost forged' } }),
    ).rejects.toThrow('invalid_argument: Expected no authorization header, which only Admin sets');
    expect(fetchAdminApi).not.toHaveBeenCalled();
  });

  it('refuses a request still running when the session ends, as ended', async () => {
    const frame = await started();
    fetchAdminApi.mockImplementation(() => new Promise(() => {}));

    const request = frame.host.fetch({ path: '/posts/' });
    await vi.waitFor(() => expect(fetchAdminApi).toHaveBeenCalled());
    session.dispose();

    await expect(request).rejects.toThrow('session_ended: The app’s session ended');
  });

  it('refuses a request still running when the page loads again, as ended', async () => {
    const frame = await started();
    fetchAdminApi.mockImplementation(() => new Promise(() => {}));

    const request = frame.host.fetch({ path: '/posts/' });
    await vi.waitFor(() => expect(fetchAdminApi).toHaveBeenCalled());
    session.restart();

    await expect(request).rejects.toThrow('session_ended: The app’s session ended');
  });

  it('lets go of a frame that unmounts, before or after it started', async () => {
    const loading = fakeFrame();
    session.attach(loading.element);
    session.attach(null);
    loading.hello();
    await settle();
    expect(loading.contentWindow.postMessage).not.toHaveBeenCalled();

    const frame = fakeFrame();
    session.attach(frame.element);
    frame.hello();
    await vi.waitFor(() => expect(session.getState().status).toBe('ready'));
    session.attach(null);
    await callUnheard(frame, 'Gone');
  });

  it('hears nothing more once disposed', async () => {
    const frame = await started();
    const listener = vi.fn();
    session.subscribe(listener);

    session.dispose();

    await callUnheard(frame, 'Gone');
    session.restart();
    const next = fakeFrame();
    session.attach(next.element);
    next.hello();
    await settle();
    expect(next.contentWindow.postMessage).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    expect(session.getState().status).toBe('ready');
  });
});
