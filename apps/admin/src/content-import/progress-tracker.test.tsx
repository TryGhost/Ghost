import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode, useEffect, type ReactNode } from 'react';
import type { User } from '@tryghost/admin-x-framework/api/users';
import { APIError } from '@tryghost/admin-x-framework/errors';
import { ImportProgressTracker } from './progress-tracker';
import { useImportProgress } from './use-import-progress';

const { useProgress, featureFlag } = vi.hoisted(() => ({
  useProgress: vi.fn(),
  featureFlag: vi.fn(),
}));
vi.mock('@tryghost/admin-x-framework/api/posts', () => ({ useContentCSVProgress: useProgress }));
vi.mock('@tryghost/admin-x-framework/hooks', () => ({ useFeatureFlag: featureFlag }));
vi.mock('@tryghost/admin-x-framework/helpers', () => ({
  getGhostPaths: () => ({ adminRoot: '/blog/ghost/' }),
}));

const id = 'abcdefabcdefabcdefabcdef';
const otherId = '123456789012345678901234';
const user = { id: 'staff', roles: [{ name: 'Owner' }] } as User;
const key = 'ghost:csv-imports:/blog/ghost/:staff';
const data = { meta: { import_id: id, status: 'running', processed: 62, total: 100 } };
const wrapper = ({ children }: { children: ReactNode }) => (
  <>
    <ImportProgressTracker user={user} />
    {children}
  </>
);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  featureFlag.mockReturnValue(true);
  useProgress.mockReturnValue({ data, error: null });
});
afterEach(() => localStorage.clear());

it('tracks accepted imports once and restores progress after remount', async () => {
  const { result, unmount } = renderHook(useImportProgress, { wrapper });
  expect(result.current.imports).toEqual([]);
  act(() => {
    result.current.track('bad');
    result.current.track(id);
    result.current.track(id);
  });
  await waitFor(() => expect(result.current.imports).toEqual([{ ...data.meta, stale: false }]));
  expect(JSON.parse(localStorage.getItem(key)!)).toEqual([id]);
  const options = useProgress.mock.calls.at(-1)![1] as {
    defaultErrorHandler: boolean;
    retry: boolean;
    refetchInterval: (query: { state: { data?: { meta: { status: string } } } }) => number | false;
  };
  expect(options.defaultErrorHandler).toBe(false);
  expect(options.retry).toBe(false);
  expect(options.refetchInterval({ state: {} })).toBe(5000);
  expect(options.refetchInterval({ state: { data } })).toBe(5000);
  for (const status of ['complete', 'failed']) {
    expect(options.refetchInterval({ state: { data: { meta: { status } } } })).toBe(false);
  }
  unmount();
  const remounted = renderHook(useImportProgress, { wrapper });
  await waitFor(() => expect(remounted.result.current.imports).toHaveLength(1));
});

it.each(['complete', 'failed'])(
  'forgets a %s import and keeps other active imports',
  async (status) => {
    localStorage.setItem(key, JSON.stringify([id, otherId]));
    let firstData = data;
    const secondData = { meta: { ...data.meta, import_id: otherId } };
    useProgress.mockImplementation((importId: string) => ({
      data: importId === id ? firstData : secondData,
      error: null,
    }));
    const { result, rerender } = renderHook(useImportProgress, { wrapper });
    await waitFor(() => expect(result.current.imports).toHaveLength(2));
    firstData = { meta: { ...data.meta, status } };
    rerender();
    await waitFor(() =>
      expect(result.current.imports.map((item) => item.import_id)).toEqual([otherId]),
    );
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual([otherId]);
  },
);

it.each(['complete', 'failed'])('forgets a previously %s import on reload', async (status) => {
  localStorage.setItem(key, JSON.stringify([id]));
  useProgress.mockReturnValue({ data: { meta: { ...data.meta, status } }, error: null });
  const { result } = renderHook(useImportProgress, { wrapper });
  await waitFor(() => expect(localStorage.getItem(key)).toBeNull());
  expect(result.current.imports).toEqual([]);
});

it.each([403, 404])('forgets unavailable imports without a toast (%s)', async (status) => {
  localStorage.setItem(key, JSON.stringify([id]));
  useProgress.mockReturnValue({
    data: undefined,
    error: new APIError(new Response(null, { status })),
  });
  const { result } = renderHook(useImportProgress, { wrapper });
  await waitFor(() => expect(localStorage.getItem(key)).toBeNull());
  expect(result.current.imports).toEqual([]);
});

it('keeps transient failures retryable and restores the latest progress', async () => {
  localStorage.setItem(key, JSON.stringify([id]));
  useProgress.mockReturnValue({ data: undefined, error: new Error('offline') });
  const { result, rerender } = renderHook(useImportProgress, { wrapper });
  expect(result.current.imports).toEqual([]);
  expect(localStorage.getItem(key)).not.toBeNull();
  useProgress.mockReturnValue({ data, error: new APIError() });
  rerender();
  await waitFor(() => expect(result.current.imports[0]?.stale).toBe(true));
  useProgress.mockReturnValue({ data: { meta: { ...data.meta, processed: 90 } }, error: null });
  rerender();
  await waitFor(() => expect(result.current.imports[0]?.processed).toBe(90));
  expect(result.current.imports[0]?.stale).toBe(false);
});

it('synchronizes other tabs without mixing other sites or users', async () => {
  localStorage.setItem('ghost:csv-imports:/other/ghost/:staff', JSON.stringify([id]));
  localStorage.setItem('ghost:csv-imports:/blog/ghost/:someone-else', JSON.stringify([id]));
  const { result } = renderHook(useImportProgress, { wrapper });
  expect(result.current.imports).toEqual([]);
  expect(useProgress).not.toHaveBeenCalled();
  act(() => {
    window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }));
  });
  expect(useProgress).not.toHaveBeenCalled();
  useProgress.mockImplementation((importId: string) =>
    importId === id ? { data, error: null } : { data: secondData, error: null },
  );
  const secondData = { meta: { ...data.meta, import_id: otherId, status: 'queued' } };
  act(() => {
    localStorage.setItem(key, JSON.stringify([id, otherId]));
    window.dispatchEvent(new StorageEvent('storage', { key }));
  });
  await waitFor(() =>
    expect(result.current.imports.map((item) => item.import_id)).toEqual([id, otherId]),
  );
  act(() => {
    localStorage.clear();
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
  });
  expect(result.current.imports).toEqual([]);
});

it.each(['flag off', 'Editor'])('does not poll without access (%s)', (mode) => {
  localStorage.setItem(key, JSON.stringify([id]));
  featureFlag.mockReturnValue(mode !== 'flag off');
  const current = mode === 'Editor' ? ({ ...user, roles: [{ name: 'Editor' }] } as User) : user;
  const { result } = renderHook(useImportProgress, {
    wrapper: ({ children }) => (
      <>
        <ImportProgressTracker user={current} />
        {children}
      </>
    ),
  });
  expect(result.current.imports).toEqual([]);
  expect(useProgress).not.toHaveBeenCalled();
});

it('allows consumers to mount independently of the tracker', () => {
  const { result } = renderHook(useImportProgress);
  expect(result.current.imports).toEqual([]);
  act(() => {
    result.current.track(id);
    result.current.dismiss(id);
  });
  expect(localStorage.getItem(key)).toBeNull();
  expect(useProgress).not.toHaveBeenCalled();
});

it('shares one poller across independent consumers and releases it on unmount', async () => {
  const mounted = vi.fn();
  const stopped = vi.fn();
  useProgress.mockImplementation(() => {
    useEffect(() => {
      mounted();
      return stopped;
    }, []);
    return { data, error: null };
  });
  const tracker = renderHook(() => {}, { wrapper });
  const sidebar = renderHook(useImportProgress);
  const settings = renderHook(useImportProgress);
  act(() => settings.result.current.track(id));
  await waitFor(() =>
    expect(sidebar.result.current.imports).toEqual([{ ...data.meta, stale: false }]),
  );
  expect(settings.result.current.imports).toEqual(sidebar.result.current.imports);
  expect(mounted).toHaveBeenCalledTimes(1);
  settings.unmount();
  expect(stopped).not.toHaveBeenCalled();
  tracker.unmount();
  expect(stopped).toHaveBeenCalledTimes(1);
  expect(sidebar.result.current.imports).toEqual([]);
  expect(JSON.parse(localStorage.getItem(key)!)).toEqual([id]);
});

it('isolates user changes and ignores actions retained from the previous session', async () => {
  let current = user;
  localStorage.setItem(key, JSON.stringify([id]));
  const { result, rerender } = renderHook(useImportProgress, {
    wrapper: ({ children }) => (
      <>
        <ImportProgressTracker user={current} />
        {children}
      </>
    ),
  });
  await waitFor(() => expect(result.current.imports).toHaveLength(1));
  const previous = result.current;
  current = { ...user, id: 'someone-else' };
  rerender();
  expect(result.current.imports).toEqual([]);
  act(() => {
    previous.track(otherId);
    previous.dismiss(id);
  });
  expect(localStorage.getItem('ghost:csv-imports:/blog/ghost/:someone-else')).toBeNull();
  expect(JSON.parse(localStorage.getItem(key)!)).toEqual([id]);
  current = user;
  rerender();
  await waitFor(() => expect(result.current.imports).toHaveLength(1));
});

it.each(['flag off', 'Editor'])(
  'disconnects an active tracker when access changes (%s)',
  async (mode) => {
    let current = user;
    localStorage.setItem(key, JSON.stringify([id]));
    const { result, rerender } = renderHook(useImportProgress, {
      wrapper: ({ children }) => (
        <>
          <ImportProgressTracker user={current} />
          {children}
        </>
      ),
    });
    await waitFor(() => expect(result.current.imports).toHaveLength(1));
    if (mode === 'flag off') {
      featureFlag.mockReturnValue(false);
    } else {
      current = { ...user, roles: [{ name: 'Editor' }] } as User;
    }
    rerender();
    expect(result.current.imports).toEqual([]);
    useProgress.mockClear();
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key }));
    });
    expect(useProgress).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual([id]);
  },
);

it('restores tracking under StrictMode effect cleanup and reconnection', async () => {
  localStorage.setItem(key, JSON.stringify([id]));
  const { result } = renderHook(useImportProgress, {
    wrapper: ({ children }) => (
      <StrictMode>
        <ImportProgressTracker user={user} />
        {children}
      </StrictMode>
    ),
  });
  await waitFor(() => expect(result.current.imports).toEqual([{ ...data.meta, stale: false }]));
  act(() => result.current.dismiss(id));
  expect(result.current.imports).toEqual([]);
  expect(localStorage.getItem(key)).toBeNull();
});
