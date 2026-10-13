import { ThreadMessagePort } from '@quilted/threads';
import {
  type AppExports,
  HELLO_MESSAGE_TYPE,
  type HostExports,
  type StartContext,
} from '@tryghost/app-contracts/bridge';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type AppFrameSession, createAppFrameSession } from './app-frame-session';
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
 * A frame holding an app's page, as far as Admin can see one: a window that Admin posts the
 * connect message to, and that says hello. The page's side of the channel answers with
 * `app`, which a spec can hold back; `host` is Admin's side, as the page calls it.
 */
function fakeFrame() {
  const app = {
    start: vi.fn<AppExports['start']>(async () => {}),
    themeChanged: vi.fn<AppExports['themeChanged']>(async () => {}),
    pathChanged: vi.fn<AppExports['pathChanged']>(async () => {}),
  };
  let thread: ThreadMessagePort<HostExports, AppExports> | undefined;
  const contentWindow = {
    postMessage: vi.fn((_message: unknown, _origin: string, transfer: Transferable[] = []) => {
      const port = transfer[0] as MessagePort;
      thread = new ThreadMessagePort<HostExports, AppExports>(port, { exports: app });
      port.start();
    }),
  };
  return {
    element: { contentWindow } as unknown as HTMLIFrameElement,
    app,
    contentWindow,
    /** Says hello from the page, as its SDK does once loaded. */
    hello(origin = ORIGIN) {
      const event = new MessageEvent('message', {
        data: { type: HELLO_MESSAGE_TYPE, sdk: 'test' },
        origin,
      });
      Object.defineProperty(event, 'source', { value: contentWindow });
      window.dispatchEvent(event);
    },
    get host() {
      if (!thread) {
        throw new Error('Not connected');
      }
      return thread.imports;
    },
  };
}

type FakeFrame = ReturnType<typeof fakeFrame>;

describe('createAppFrameSession', () => {
  let session: AppFrameSession;
  let admin: { context: StartContext };
  const navigate = vi.fn();
  const open = vi.fn();
  const previousTimeout = appFrameTimeouts.ready;

  beforeEach(() => {
    admin = { context: context() };
    session = createAppFrameSession({
      surfaceOrigin: ORIGIN,
      context: () => admin.context,
      fetchAdminApi: vi.fn(),
      navigate,
      open,
    });
  });

  afterEach(() => {
    session.dispose();
    appFrameTimeouts.ready = previousTimeout;
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  /** Has the page set its title over a channel Admin has let go of, which changes nothing. */
  async function callUnheard(frame: FakeFrame, title: string) {
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

  it('loads the page again when a started page says hello again, as a reload does', async () => {
    const frame = await started();

    frame.hello();

    await vi.waitFor(() =>
      expect(session.getState()).toMatchObject({ status: 'loading', attempt: 1 }),
    );
    // The old frame's channel is closed: the reloaded page is started in the next frame.
    await callUnheard(frame, 'Old');
    const next = fakeFrame();
    session.attach(next.element);
    next.hello();
    await vi.waitFor(() => expect(session.getState().status).toBe('ready'));
  });

  it('ignores a hello sent again while the app is starting', async () => {
    const frame = fakeFrame();
    frame.app.start.mockImplementation(() => settle());
    session.attach(frame.element);

    frame.hello();
    frame.hello();

    await vi.waitFor(() => expect(session.getState().status).toBe('ready'));
    expect(session.getState().attempt).toBe(0);
    expect(frame.contentWindow.postMessage).toHaveBeenCalledTimes(1);
  });

  it('follows the app’s route without telling it back where it went', async () => {
    const frame = await started();

    await frame.host.pathChanged('/episodes/12', { replace: true });
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/episodes/12', { replace: true });
    // Admin follows, which moves its address within the app to where the app already is.
    session.pathChanged('/episodes/12');
    await settle();
    expect(frame.app.pathChanged).not.toHaveBeenCalled();

    // Back, to where the app no longer is: that it hears about.
    session.pathChanged('/');
    await vi.waitFor(() => expect(frame.app.pathChanged).toHaveBeenCalledExactlyOnceWith('/'));
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
