import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APIError } from '@tryghost/admin-x-framework/errors';
import type { PresenceResource } from '@tryghost/admin-x-framework/api/presence';
import { usePresence, usePresenceEnabled } from './use-presence';
import { useVisibleResources } from './use-visible-resources';

const mocks = vi.hoisted(() => {
  const poll =
    vi.fn<(resources: PresenceResource[], editing?: PresenceResource) => Promise<unknown>>();
  const leave = vi.fn<(resource: PresenceResource) => void>();
  // One object, as the real hook memoises its result.
  return { enabled: true, poll, leave, api: { poll, leave } };
});
vi.mock('@tryghost/admin-x-framework/hooks', () => ({
  useFeatureFlag: () => mocks.enabled,
}));
vi.mock('@tryghost/admin-x-framework/api/presence', () => ({
  usePresenceApi: () => mocks.api,
}));

const resource: PresenceResource = { id: 'a'.repeat(24), type: 'post' };
const other = {
  userId: 'o'.repeat(24),
  resourceType: 'post' as const,
  resourceId: resource.id,
  ts: 0,
};

describe('usePresence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    mocks.enabled = true;
    mocks.poll.mockReset().mockResolvedValue({ presence: [{ active: [other], serverTime: 0 }] });
    mocks.leave.mockReset();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('sends nothing while the flag is off', async () => {
    mocks.enabled = false;
    const observer = vi.fn();
    vi.stubGlobal('IntersectionObserver', observer);
    const hook = renderHook(() => {
      const enabled = usePresenceEnabled();
      useVisibleResources({ current: null }, [resource], enabled);
      return usePresence([resource], resource);
    });
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(observer).not.toHaveBeenCalled();
    expect(mocks.poll).not.toHaveBeenCalled();
    expect(hook.result.current.active).toEqual([]);
    hook.unmount();
  });

  it('heartbeats the edited document and reports the others it gets back', async () => {
    const hook = renderHook(() => usePresence([resource], resource));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(hook.result.current.active).toEqual([other]);
    expect(mocks.poll).toHaveBeenCalledWith([resource], resource);
    hook.unmount();
  });

  it('polls lists without editing', async () => {
    const hook = renderHook(() => usePresence([resource]));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(mocks.poll).toHaveBeenCalledWith([resource], undefined);
    hook.unmount();
  });

  it('ignores a malformed response', async () => {
    mocks.poll.mockResolvedValue({
      presence: [{ active: [{ ...other, ts: 'now' }], serverTime: 0 }],
    });
    const hook = renderHook(() => usePresence([resource]));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(hook.result.current.active).toEqual([]);
    hook.unmount();
  });

  it('stops after one request against an older backend and does not send leave', async () => {
    mocks.poll.mockRejectedValue(new APIError(new Response(null, { status: 404 })));
    const hook = renderHook(() => usePresence([resource], resource));
    await act(() => vi.advanceTimersByTimeAsync(120_000));
    expect(mocks.poll).toHaveBeenCalledTimes(1);
    hook.unmount();
    expect(mocks.leave).not.toHaveBeenCalled();
  });

  it('clears and backs off on a server failure, then polls the latest rows', async () => {
    mocks.poll.mockRejectedValueOnce(new APIError(new Response(null, { status: 503 })));
    const hook = renderHook(({ resources }) => usePresence(resources), {
      initialProps: { resources: [resource] },
    });
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(hook.result.current.active).toEqual([]);
    const next = { ...resource, id: 'c'.repeat(24) };
    hook.rerender({ resources: [next] });
    await act(() => vi.advanceTimersByTimeAsync(19_999));
    expect(mocks.poll).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(mocks.poll).toHaveBeenCalledTimes(2);
    expect(mocks.poll).toHaveBeenLastCalledWith([next], undefined);
    hook.unmount();
  });

  it('keeps entries for rows outside the current poll until a poll covers them again', async () => {
    mocks.poll.mockImplementation(() =>
      Promise.resolve({ presence: [{ active: [], serverTime: Date.now() }] }),
    );
    mocks.poll.mockResolvedValueOnce({ presence: [{ active: [other], serverTime: 0 }] });
    const hook = renderHook(({ resources }) => usePresence(resources), {
      initialProps: { resources: [resource] },
    });
    await act(() => vi.advanceTimersByTimeAsync(0));
    hook.rerender({ resources: [{ ...resource, id: 'c'.repeat(24) }] });
    await act(() => vi.advanceTimersByTimeAsync(20_000));
    expect(hook.result.current.active).toEqual([other]);
    hook.rerender({ resources: [resource] });
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(hook.result.current.active).toEqual([]);
    hook.unmount();
  });

  it('sends leave and clears when the tab hides, and again when the route unmounts', async () => {
    const hook = renderHook(() => usePresence([resource], resource));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(hook.result.current.active).toEqual([other]);
    act(() => {
      Object.defineProperty(document, 'hidden', { value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(hook.result.current.active).toEqual([]);
    expect(mocks.leave).toHaveBeenCalledTimes(1);
    expect(mocks.leave).toHaveBeenCalledWith(resource);
    act(() => {
      Object.defineProperty(document, 'hidden', { value: false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    hook.unmount();
    expect(mocks.leave).toHaveBeenCalledTimes(2);
  });

  it('does not send leave for list polls', async () => {
    const hook = renderHook(() => usePresence([resource]));
    await act(() => vi.advanceTimersByTimeAsync(0));
    hook.unmount();
    expect(mocks.leave).not.toHaveBeenCalled();
  });
});
