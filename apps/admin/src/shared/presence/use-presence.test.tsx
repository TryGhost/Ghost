import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePresence, usePresenceEnabled } from './use-presence';
import { useVisibleResources } from './use-visible-resources';
import { APIError } from '@tryghost/admin-x-framework/errors';
import { z } from 'zod';

const mocks = vi.hoisted(() => ({
  enabled: true,
  supported: true,
  fetch: vi.fn<(url: string, options: { body: string }) => Promise<unknown>>(),
}));
const requestSchema = z.object({
  presence: z.array(
    z.object({
      resources: z.array(z.object({ id: z.string(), type: z.string() })),
      editing: z.unknown().optional(),
    }),
  ),
});
vi.mock('@tryghost/admin-x-framework/hooks', () => ({
  useFeatureFlag: () => mocks.enabled,
  useFetchApi: () => mocks.fetch,
}));
vi.mock('@tryghost/admin-x-framework/api/config', () => ({
  useBrowseConfig: () => ({ data: { config: { editorPresence: mocks.supported } } }),
}));
const resource = { id: 'a'.repeat(24), type: 'post' as const };
const event = {
  eventId: 'event',
  userId: 'other',
  name: 'Alex',
  avatar: null,
  resourceType: 'post',
  resourceId: resource.id,
  ts: 0,
};

describe('presence transport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    mocks.enabled = mocks.supported = true;
    mocks.fetch.mockReset().mockResolvedValue({ presence: [{ events: [event], serverTime: 0 }] });
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each(['flag', 'capability'])('sends no requests without the %s', async (missing) => {
    if (missing === 'flag') {
      mocks.enabled = false;
    } else {
      mocks.supported = false;
    }
    const observer = vi.fn();
    vi.stubGlobal('IntersectionObserver', observer);
    const hook = renderHook(() => {
      const enabled = usePresenceEnabled('me');
      useVisibleResources({ current: null }, [resource], enabled);
      return usePresence([resource], 'me', resource);
    });
    await act(() => vi.advanceTimersByTimeAsync(60000));
    expect(observer).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('combines an editor heartbeat with reads and hides the current user', async () => {
    mocks.fetch.mockResolvedValue({
      presence: [{ serverTime: 0, events: [event, { ...event, userId: 'me' }] }],
    });
    const hook = renderHook(() => usePresence([resource], 'me', resource));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(hook.result.current.events).toHaveLength(1);
    const request = requestSchema.parse(JSON.parse(mocks.fetch.mock.calls[0][1].body)).presence[0];
    expect(request.editing).toEqual(resource);
    expect(mocks.fetch.mock.calls[0][1]).toMatchObject({
      retry: false,
      sessionExpiryRedirect: false,
    });
    hook.unmount();
  });

  it('rejects malformed responses before updating avatar state', async () => {
    mocks.fetch.mockResolvedValue({
      presence: [{ events: [{ ...event, name: 42 }], serverTime: 0 }],
    });
    const hook = renderHook(() => usePresence([resource], 'me'));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(hook.result.current.events).toEqual([]);
    hook.unmount();
  });

  it('keeps backoff when visible rows change and polls the latest rows', async () => {
    mocks.fetch.mockRejectedValueOnce(new APIError(new Response(null, { status: 429 })));
    const hook = renderHook(({ resources }) => usePresence(resources, 'me'), {
      initialProps: { resources: [resource] },
    });
    await act(() => vi.advanceTimersByTimeAsync(0));
    const next = { ...resource, id: 'c'.repeat(24) };
    hook.rerender({ resources: [next] });
    await act(() => vi.advanceTimersByTimeAsync(19999));
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(
      requestSchema.parse(JSON.parse(mocks.fetch.mock.calls[1][1].body)).presence[0].resources,
    ).toEqual([next]);
    hook.unmount();
  });

  it('keeps fresh avatars when scrolling to other rows without extending their expiry', async () => {
    mocks.fetch.mockImplementation(() =>
      Promise.resolve({ presence: [{ events: [], serverTime: Date.now() }] }),
    );
    mocks.fetch.mockResolvedValueOnce({ presence: [{ events: [event], serverTime: 0 }] });
    const hook = renderHook(({ resources }) => usePresence(resources, 'me'), {
      initialProps: { resources: [resource] },
    });
    await act(() => vi.advanceTimersByTimeAsync(0));
    hook.rerender({ resources: [{ ...resource, id: 'c'.repeat(24) }] });
    await act(() => vi.advanceTimersByTimeAsync(20000));
    expect(hook.result.current.events).toEqual([event]);
    hook.rerender({ resources: [resource] });
    expect(hook.result.current.events).toEqual([event]);
    hook.rerender({ resources: [] });
    await act(() => vi.advanceTimersByTimeAsync(10000));
    expect(hook.result.current.events).toEqual([]);
    hook.unmount();
  });

  it('stops on an older backend response rather than repeatedly hitting a missing endpoint', async () => {
    mocks.fetch.mockRejectedValue(new APIError(new Response(null, { status: 404 })));
    const hook = renderHook(() => usePresence([resource], 'me'));
    await act(() => vi.advanceTimersByTimeAsync(50000));
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(hook.result.current.events).toEqual([]);
    hook.unmount();
  });

  it('clears avatars when the tab hides and ignores late responses after a route switch', async () => {
    const hook = renderHook(({ id }) => usePresence([{ ...resource, id }], 'me'), {
      initialProps: { id: resource.id },
    });
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(hook.result.current.events).toHaveLength(1);
    act(() => {
      Object.defineProperty(document, 'hidden', { value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(hook.result.current.events).toEqual([]);
    hook.rerender({ id: 'c'.repeat(24) });
    await act(() => vi.advanceTimersByTimeAsync(60000));
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    hook.unmount();
  });
});
