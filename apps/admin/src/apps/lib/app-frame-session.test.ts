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

/** Waits for messages in flight on the channel to arrive. */
const settle = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 10);
  });

/**
 * A fake document in an app's frame, as Admin sees it: the page's side of the channel, which
 * responds with `app`. A spec can make `app` hold back its responses. Like the SDK, it accepts the
 * first connect message it receives and ignores the rest. `host` is Admin's side, as the page calls
 * it.
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
 * A fake frame holding an app's page, as Admin sees it: a window that sends a hello and that Admin
 * posts the connect message to, and an element that fires `load` when it has loaded a document.
 * `app` and `host` belong to the current document (see `fakeDocument`).
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
    /**
     * Sends a hello with the current document's ID from the page, as the SDK does once loaded.
     * `source` is the window it comes from: the frame's own, unless a test says otherwise.
     */
    hello(origin = ORIGIN, id = document.id, source: object = contentWindow) {
      const event = new MessageEvent('message', {
        data: { type: HELLO_MESSAGE_TYPE, sdk: 'test', document: id },
        origin,
      });
      Object.defineProperty(event, 'source', { value: source });
      window.dispatchEvent(event);
    },
    /** Fires the frame's `load` event, as when the current document finishes loading. */
    loaded() {
      element.dispatchEvent(new Event('load'));
    },
    /** Replaces the document, as a reload or navigation does. Returns the replaced document. */
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
  const open = vi.fn<AppFrameSessionOptions['open']>(() => true);
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

  /**
   * The number of the `index`th navigation Admin made to follow the app, as its location carries
   * it.
   */
  const moveOf = (index: number): number => navigate.mock.calls[index][1].move;

  /** Sets the page's title over a channel Admin has closed, and checks that nothing changes. */
  async function callUnheard(frame: Pick<FakeFrame, 'host'>, title: string) {
    frame.host.titleChanged(title).catch(() => {});
    await settle();
    expect(session.getState().title).not.toBe(title);
  }

  /** Attaches a frame to the session, as mounting it does, and waits for its page to start. */
  async function started(): Promise<FakeFrame> {
    const frame = fakeFrame();
    session.attach(frame.element);
    frame.hello();
    await vi.waitFor(() => expect(session.getState().status).toBe('ready'));
    return frame;
  }

  it('stays loading, with the frame hidden, until the app has started', async () => {
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

  it('starts the app with Admin’s context from when the page connects', async () => {
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

  it('ignores a hello from the app’s origin that comes from another window', async () => {
    const frame = fakeFrame();
    session.attach(frame.element);
    // Such as a popup the app opened, on the app's own origin.
    const popup = { postMessage: vi.fn() };

    frame.hello(ORIGIN, undefined, popup);
    await settle();

    expect(popup.postMessage).not.toHaveBeenCalled();
    expect(frame.contentWindow.postMessage).not.toHaveBeenCalled();
    expect(session.getState().status).toBe('loading');
  });

  it('fails a page that doesn’t start in time, and notifies subscribers', () => {
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

  it('keeps a started app ready after the start timeout passes', async () => {
    appFrameTimeouts.ready = 50;
    await started();

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 80);
    });

    expect(session.getState().status).toBe('ready');
  });

  it('reloads the page in a new frame on retry, with the full start timeout', async () => {
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

  it('shows the page’s title, and clears it when the page reloads', async () => {
    const frame = await started();

    await frame.host.titleChanged('Episodes');
    expect(session.getState().title).toBe('Episodes');

    session.restart();
    expect(session.getState().title).toBeUndefined();
  });

  it('starts a new document in a started page’s frame in place, once it sends a hello', async () => {
    let finishStarting!: () => void;
    const frame = await started();
    await frame.host.titleChanged('Episodes');
    admin.context = context({ path: '/episodes/12' });

    // For example, a form post whose result is a new document.
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

  it('ends the calls of a document that another document replaced', async () => {
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

  it('reloads the page when a new document refuses to start', async () => {
    const frame = await started();

    frame.navigate();
    frame.app.start.mockRejectedValue(new Error('invalid_context: Expected a site'));
    frame.hello();

    await vi.waitFor(() =>
      expect(session.getState()).toMatchObject({ status: 'loading', attempt: 1 }),
    );
  });

  it('keeps a started page that repeats its hello, as its SDK can before Admin replies', async () => {
    const frame = await started();

    // Sent before Admin's reply reached the page, and received after the app started.
    frame.hello();
    await settle();

    expect(session.getState()).toMatchObject({ status: 'ready', attempt: 0 });
    expect(frame.contentWindow.postMessage).toHaveBeenCalledTimes(1);
    await frame.host.titleChanged('Episodes');
    expect(session.getState().title).toBe('Episodes');
  });

  it('starts the app once when it repeats its hello while starting', async () => {
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

  it('starts a page that loaded while the previous one was starting, in the time left', async () => {
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

  it('starts the latest document when several replace one that is starting in place', async () => {
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

  it('ignores a late hello from a document that was replaced', async () => {
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

  it('fails a page that keeps reloading while it starts, once the start timeout passes', async () => {
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

  it('waits for a hello from a new document in a started page’s frame, and starts it', async () => {
    const frame = await started();
    // The document's own load can fire after it started, and changes nothing.
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

  it('reloads the page when a new document in its frame doesn’t start in time', async () => {
    const frame = await started();
    frame.loaded();
    vi.useFakeTimers();

    // Navigated anywhere, for example to an origin that never sends a hello.
    frame.navigate();
    frame.loaded();
    vi.advanceTimersByTime(appFrameTimeouts.ready - 1);
    expect(session.getState()).toMatchObject({ status: 'loading', attempt: 0 });
    vi.advanceTimersByTime(1);

    expect(session.getState()).toMatchObject({ status: 'loading', attempt: 1 });
  });

  it('reloads the page when a started page’s frame loads a document from Admin’s origin', async () => {
    const frame = fakeFrame();
    session.attach(frame.element);
    // Loaded before it connected, so the next load is the first one since.
    frame.loaded();
    frame.hello();
    await vi.waitFor(() => expect(session.getState().status).toBe('ready'));

    frame.navigate();
    // Admin can read a document on its own origin.
    Object.assign(frame.element, { contentDocument: {} });
    frame.loaded();

    expect(session.getState()).toMatchObject({ status: 'loading', attempt: 1 });
  });

  describe('a page whose documents keep being replaced soon after they start', () => {
    /** Makes the started page in `frame` navigate to Admin's own origin, which Admin can read. */
    const leave = (frame: FakeFrame) => {
      frame.navigate();
      Object.assign(frame.element, { contentDocument: {} });
      frame.loaded();
    };

    /** Makes the started page in `frame` reload itself, and waits for the new document to start. */
    const reload = async (frame: FakeFrame) => {
      frame.navigate();
      frame.hello();
      await vi.waitFor(() => expect(session.getState().status).toBe('ready'));
    };

    it('is marked unresponsive when it reloads itself as soon as it starts', async () => {
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

    it('is marked unresponsive when it navigates away as soon as it starts, until Try again', async () => {
      for (let attempt = 1; attempt <= MAX_SHORT_LIVED; attempt += 1) {
        leave(await started());
        expect(session.getState()).toMatchObject({ status: 'loading', attempt });
      }

      leave(await started());

      expect(session.getState()).toMatchObject({ status: 'failed', attempt: MAX_SHORT_LIVED });
      // Try again resets the count.
      session.restart();
      for (let attempt = MAX_SHORT_LIVED + 2; attempt <= 2 * MAX_SHORT_LIVED + 1; attempt += 1) {
        leave(await started());
        expect(session.getState()).toMatchObject({ status: 'loading', attempt });
      }
    });

    it('counts documents started in place and fresh page loads together', async () => {
      const frame = await started();
      for (let count = 1; count < MAX_SHORT_LIVED; count += 1) {
        await reload(frame);
      }
      leave(frame);
      expect(session.getState()).toMatchObject({ status: 'loading', attempt: 1 });

      leave(await started());

      expect(session.getState()).toMatchObject({ status: 'failed', attempt: 1 });
    });

    it('isn’t stopped while each document stays open for a while', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      const frame = await started();
      // A publisher moving through a server-rendered app, one page every few seconds.
      for (let count = 1; count <= 3 * MAX_SHORT_LIVED; count += 1) {
        vi.setSystemTime(Date.now() + SHORT_LIVED_MS);
        await reload(frame);
      }
      // A document that stays open for a while resets the count.
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

    it('isn’t stopped by a publisher clicking through a few pages, each in under three seconds', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      const frame = await started();
      // Two seconds a page, as a publisher who knows where they're going might.
      const nextPage = async () => {
        vi.setSystemTime(Date.now() + 2_000);
        await reload(frame);
      };
      // Five pages, as the cap is meant to allow; a cap of three would stop them.
      for (let page = 1; page <= 5; page += 1) {
        await nextPage();
      }
      expect(session.getState()).toMatchObject({ status: 'ready', attempt: 0 });

      // They stop to read a page, then click on through five more.
      vi.setSystemTime(Date.now() + 30_000);
      await reload(frame);
      for (let page = 1; page <= 5; page += 1) {
        await nextPage();
      }
      expect(session.getState()).toMatchObject({ status: 'ready', attempt: 0 });
    });

    it('counts each fresh page load, even one after a document that stayed open', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      const frame = await started();
      vi.setSystemTime(Date.now() + SHORT_LIVED_MS);
      leave(frame);
      for (let attempt = 2; attempt <= MAX_SHORT_LIVED; attempt += 1) {
        leave(await started());
        expect(session.getState()).toMatchObject({ status: 'loading', attempt });
      }

      leave(await started());

      expect(session.getState()).toMatchObject({ status: 'failed', attempt: MAX_SHORT_LIVED });
    });

    it('is reloaded each time it navigates away after staying open for a while', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      for (let attempt = 1; attempt <= 2 * MAX_SHORT_LIVED; attempt += 1) {
        const frame = await started();
        vi.setSystemTime(Date.now() + SHORT_LIVED_MS);
        leave(frame);
        expect(session.getState()).toMatchObject({ status: 'loading', attempt });
      }
    });
  });

  it('keeps a started page that was reached through a redirect in script', async () => {
    const frame = fakeFrame();
    session.attach(frame.element);
    // The frame's first document loads, then redirects the frame to the app's page in script.
    frame.loaded();
    frame.navigate();
    frame.hello();
    await vi.waitFor(() => expect(session.getState().status).toBe('ready'));

    // The app's page finishes loading after it started.
    frame.loaded();
    await settle();

    expect(session.getState()).toMatchObject({ status: 'ready', attempt: 0 });
  });

  it('follows the app’s route without sending the route back to the app', async () => {
    const frame = await started();

    // Answers with the path Admin now has for the app, which the page stores.
    await expect(frame.host.pathChanged('/episodes/12', 'push')).resolves.toBe('/episodes/12');
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/episodes/12', {
      replace: false,
      move: moveOf(0),
    });
    // Admin follows, which changes Admin's path within the app to the app's current path.
    session.pathChanged('/episodes/12', moveOf(0));
    await settle();
    expect(frame.app.pathChanged).not.toHaveBeenCalled();

    // Going back to a route the app has left is sent to the app.
    session.pathChanged('/');
    await vi.waitFor(() => expect(frame.app.pathChanged).toHaveBeenCalledExactlyOnceWith('/'));
  });

  it('refuses a move that is neither a push nor a replace', async () => {
    const frame = await started();

    await expect(frame.host.pathChanged('/a', 'sideways' as never)).rejects.toThrow(
      'invalid_argument: Expected a move of push or replace',
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('follows the app quickly through several routes to the last one, sending nothing back', async () => {
    const frame = await started();

    // The app moves away and back before Admin has followed either move.
    // Such as an auth guard's bounce, which replaces the route it came from.
    await Promise.all([
      frame.host.pathChanged('/login', 'push'),
      frame.host.pathChanged('/', 'replace'),
    ]);
    expect(navigate.mock.calls).toEqual([
      ['/login', { replace: false, move: moveOf(0) }],
      ['/', { replace: true, move: moveOf(0) + 1 }],
    ]);
    // Admin arrives at each route in turn, including the one the app has left.
    session.pathChanged('/login', moveOf(0));
    session.pathChanged('/', moveOf(1));
    await settle();
    expect(frame.app.pathChanged).not.toHaveBeenCalled();

    // Then Admin navigates without an app move, so the path is sent to the app.
    session.pathChanged('/episodes');
    await vi.waitFor(() =>
      expect(frame.app.pathChanged).toHaveBeenCalledExactlyOnceWith('/episodes'),
    );
  });

  it('follows the app to its last route when Admin skips one in between', async () => {
    const frame = await started();

    await Promise.all([frame.host.pathChanged('/a', 'push'), frame.host.pathChanged('/b', 'push')]);
    // Only the last route is rendered.
    session.pathChanged('/b', moveOf(1));
    await settle();
    expect(frame.app.pathChanged).not.toHaveBeenCalled();

    // A location with the marker of a move Admin has since left behind isn't an app move, so its
    // path is sent to the app.
    session.pathChanged('/a', moveOf(0));
    await vi.waitFor(() => expect(frame.app.pathChanged).toHaveBeenCalledExactlyOnceWith('/a'));
  });

  it('follows navigations a render merges into one ending where Admin was, then sends Back', async () => {
    const frame = await started();

    // An auth guard's bounce: the app moves away and back before Admin has rendered either move.
    await Promise.all([
      frame.host.pathChanged('/login', 'push'),
      frame.host.pathChanged('/', 'push'),
    ]);
    // Both commit as one location, with the last move's number, on the route Admin was already on.
    session.pathChanged('/', moveOf(1));
    await settle();
    expect(frame.app.pathChanged).not.toHaveBeenCalled();

    // Going back to the entry the first move created isn't an app move, so it's sent to the app.
    session.pathChanged('/login', moveOf(0));
    await vi.waitFor(() => expect(frame.app.pathChanged).toHaveBeenCalledExactlyOnceWith('/login'));
  });

  it('sends a new document the route Admin was still navigating to when it connected', async () => {
    const frame = await started();
    await frame.host.pathChanged('/episodes', 'push');

    // A new document starts at Admin's current path, before Admin has arrived.
    frame.navigate();
    frame.hello();
    await vi.waitFor(() => expect(frame.app.start).toHaveBeenCalledWith(admin.context));
    await vi.waitFor(() => expect(session.getState().status).toBe('ready'));
    session.pathChanged('/episodes', moveOf(0));

    await vi.waitFor(() =>
      expect(frame.app.pathChanged).toHaveBeenCalledExactlyOnceWith('/episodes'),
    );
  });

  it('sends the app Admin’s path when Admin doesn’t follow it', async () => {
    const frame = await started();
    // The publisher is leaving the app.
    navigate.mockReturnValueOnce(false);

    await expect(frame.host.pathChanged('/episodes', 'push')).resolves.toBe('/');

    await vi.waitFor(() => expect(frame.app.pathChanged).toHaveBeenCalledExactlyOnceWith('/'));
    // Admin has nothing to catch up with, so navigating there is sent to the app.
    session.pathChanged('/episodes');
    await vi.waitFor(() => expect(frame.app.pathChanged).toHaveBeenLastCalledWith('/episodes'));
  });

  it('doesn’t navigate Admin to the route it is already on', async () => {
    const frame = await started();

    await frame.host.pathChanged('/', 'push');

    expect(navigate).not.toHaveBeenCalled();
  });

  it('sends the app a theme it doesn’t have yet, once', async () => {
    const frame = await started();
    const dark = { mode: 'dark', accent_color: '#ff5500' } as const;

    session.themeChanged(admin.context.theme);
    session.themeChanged(dark);
    session.themeChanged({ ...dark });

    await vi.waitFor(() => expect(frame.app.themeChanged).toHaveBeenCalledExactlyOnceWith(dark));
  });

  it('sends a page nothing before it has connected', async () => {
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

  it('rejects a place Admin doesn’t open because the publisher is leaving', async () => {
    const frame = await started();
    open.mockReturnValueOnce(false);

    await expect(frame.host.open({ apps: true })).rejects.toThrow(
      'rejected: The publisher is on their way elsewhere in Admin',
    );
  });

  it('sends the app’s validated request with a signal that aborts when the session ends', async () => {
    const frame = await started();
    fetchAdminApi.mockResolvedValue({ status: 200, statusText: 'OK', headers: {}, body: '{}' });

    await expect(frame.host.fetch({ path: '/posts/' })).resolves.toMatchObject({ status: 200 });

    const [request, signal] = fetchAdminApi.mock.calls[0];
    expect(request).toEqual({ path: '/posts/' });
    expect(signal.aborted).toBe(false);
    session.dispose();
    expect(signal.aborted).toBe(true);
  });

  it('refuses a request that sets a header only Admin sets, without sending it', async () => {
    const frame = await started();

    await expect(
      frame.host.fetch({ path: '/posts/', headers: { Authorization: 'Ghost forged' } }),
    ).rejects.toThrow('invalid_argument: Expected no authorization header, which only Admin sets');
    expect(fetchAdminApi).not.toHaveBeenCalled();
  });

  it('rejects a running request with session_ended when the session ends', async () => {
    const frame = await started();
    fetchAdminApi.mockImplementation(() => new Promise(() => {}));

    const request = frame.host.fetch({ path: '/posts/' });
    await vi.waitFor(() => expect(fetchAdminApi).toHaveBeenCalled());
    session.dispose();

    await expect(request).rejects.toThrow('session_ended: The app’s session ended');
  });

  it('rejects a running request with session_ended when the page reloads', async () => {
    const frame = await started();
    fetchAdminApi.mockImplementation(() => new Promise(() => {}));

    const request = frame.host.fetch({ path: '/posts/' });
    await vi.waitFor(() => expect(fetchAdminApi).toHaveBeenCalled());
    session.restart();

    await expect(request).rejects.toThrow('session_ended: The app’s session ended');
  });

  it('releases a frame that unmounts, before or after it started', async () => {
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

  it('ignores everything once disposed', async () => {
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
