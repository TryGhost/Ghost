import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import * as Sentry from '@sentry/react';
import { useSentry } from './use-sentry';

const { envelopes, location, replay, site, currentUser, config, routePattern } = vi.hoisted(() => ({
  envelopes: [] as string[],
  location: { pathname: '/tags' },
  replay: vi.fn<() => FakeReplay | undefined>(),
  site: vi.fn<() => { site: Record<string, unknown> } | undefined>(),
  currentUser: vi.fn<() => { roles: Array<{ name: string }> } | undefined>(),
  config: vi.fn<(options: { enabled?: boolean }) => { config: { version: string } } | undefined>(),
  routePattern: vi.fn<() => string | null>(),
}));

vi.mock('@sentry/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sentry/react')>();
  const transport = (options: Parameters<typeof actual.createTransport>[0]) =>
    actual.createTransport(options, (request) => {
      envelopes.push(String(request.body));
      return Promise.resolve({ statusCode: 200 });
    });
  return {
    ...actual,
    init: vi.fn((options: Sentry.BrowserOptions) => actual.init({ ...options, transport })),
  };
});
vi.mock('@tryghost/admin-x-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tryghost/admin-x-framework')>()),
  useLocation: () => ({ pathname: location.pathname }),
}));
vi.mock('./init-sentry', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./init-sentry')>()),
  getReplay: () => replay(),
}));
vi.mock('@tryghost/admin-x-framework/api/site', () => ({
  useBrowseSite: () => ({ data: site() }),
}));
vi.mock('@tryghost/admin-x-framework/api/current-user', () => ({
  useCurrentUser: () => ({ data: currentUser() }),
}));
vi.mock('@tryghost/admin-x-framework/api/config', () => ({
  useBrowseConfig: (options: { enabled?: boolean }) => ({ data: config(options) }),
}));
vi.mock('@/routes', () => ({ useRoutePattern: routePattern }));

const DSN = 'https://public@o0.ingest.sentry.io/1';
const MASK = 'data-sentry-automations-mask';

interface FakeReplay {
  start: () => void;
  stop: () => Promise<void>;
  startBuffering: () => void;
}

function fakeReplay() {
  return {
    start: vi.fn(),
    stop: vi.fn(() => Promise.resolve()),
    startBuffering: vi.fn(),
  };
}

function sentEvents(): Sentry.Event[] {
  return envelopes.flatMap((envelope) => {
    const [, ...lines] = envelope.split('\n');
    const events: Sentry.Event[] = [];
    for (let index = 0; index < lines.length; index += 2) {
      const itemHeader = JSON.parse(lines[index]) as { type: string };
      if (itemHeader.type === 'event') {
        events.push(JSON.parse(lines[index + 1]) as Sentry.Event);
      }
    }
    return events;
  });
}

async function captureProbe(): Promise<Sentry.Event | undefined> {
  Sentry.captureMessage('probe');
  await Sentry.flush();
  return sentEvents().at(-1);
}

function renderUseSentry() {
  return renderHook(() => useSentry(), { wrapper: StrictMode });
}

describe('useSentry', () => {
  beforeEach(() => {
    envelopes.length = 0;
    location.pathname = '/tags';
    replay.mockReturnValue(undefined);
    vi.mocked(Sentry.init).mockClear();
    site.mockReturnValue({ site: { version: '6.1', sentry_dsn: DSN, sentry_env: 'testing' } });
    currentUser.mockReturnValue(undefined);
    config.mockReturnValue(undefined);
    routePattern.mockReturnValue('/tags');
  });

  afterEach(async () => {
    cleanup();
    await Sentry.close();
    const hub = Sentry.getCurrentHub();
    hub.bindClient(undefined);
    hub.getScope().clear();
    hub.getIsolationScope().clear();
  });

  it('does not initialise without a DSN', () => {
    site.mockReturnValue({ site: { version: '6.1' } });

    renderUseSentry();

    expect(Sentry.init).not.toHaveBeenCalled();
    expect(Sentry.getClient()).toBeUndefined();
  });

  it('initialises once with the site DSN, environment and short version', () => {
    renderUseSentry();

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: DSN, environment: 'testing', release: 'ghost@6.1' }),
    );
  });

  it('only loads the full version once signed in', () => {
    const { rerender } = renderUseSentry();
    expect(config).toHaveBeenLastCalledWith({ enabled: false });

    currentUser.mockReturnValue({ roles: [{ name: 'Editor' }] });
    rerender();
    expect(config).toHaveBeenLastCalledWith({ enabled: true });
  });

  it('tags events with the React route pattern', async () => {
    renderUseSentry();

    expect((await captureProbe())?.tags?.route).toBe('/tags');
  });

  it('reports the full release and only the role once signed in', async () => {
    const { rerender } = renderUseSentry();

    const signedOutEvent = await captureProbe();
    expect(signedOutEvent?.release).toBe('ghost@6.1');
    expect(signedOutEvent?.user).toBeUndefined();

    currentUser.mockReturnValue({ roles: [{ name: 'Administrator' }] });
    config.mockReturnValue({ config: { version: '6.1.2' } });
    rerender();

    const signedInEvent = await captureProbe();
    expect(signedInEvent?.release).toBe('ghost@6.1.2');
    expect(signedInEvent?.user).toEqual({ role: 'Administrator' });
  });

  it('masks Automations while it shows and records once from the first visit', async () => {
    const fakeReplayIntegration = fakeReplay();
    replay.mockReturnValue(fakeReplayIntegration);
    const { rerender, unmount } = renderUseSentry();
    await vi.waitFor(() => expect(Sentry.init).toHaveBeenCalled());
    expect(document.body.hasAttribute(MASK)).toBe(false);

    location.pathname = '/automations';
    rerender();
    expect(document.body.getAttribute(MASK)).toBe('true');
    await vi.waitFor(() => expect(fakeReplayIntegration.start).toHaveBeenCalledTimes(1));
    expect(fakeReplayIntegration.stop).toHaveBeenCalledTimes(1);
    expect((await captureProbe())?.tags?.replay_area).toBe('automations');

    location.pathname = '/posts';
    rerender();
    expect(document.body.hasAttribute(MASK)).toBe(false);

    location.pathname = '/automations/abc123';
    rerender();
    expect(document.body.getAttribute(MASK)).toBe('true');
    unmount();
    expect(document.body.hasAttribute(MASK)).toBe(false);
    expect(fakeReplayIntegration.start).toHaveBeenCalledTimes(1);
  });
});
