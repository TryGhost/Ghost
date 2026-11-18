import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivePresence } from '@/shared/presence/presence-api';
import type { LeaseStatus } from '@/shared/presence/use-presence';
import {
  INITIAL_TRACK,
  TAKEOVER_GRACE_MS,
  TAKEOVER_MAX_MS,
  advanceLease,
  useEditLease,
} from './use-edit-lease';

const ME = 'm'.repeat(24);
const OTHER = 'o'.repeat(24);
const POST = 'p'.repeat(24);
const mine: LeaseStatus = { userId: ME, mine: true };
const theirs: LeaseStatus = { userId: OTHER, mine: false };
const present = (ts: number): ActivePresence[] => [
  { userId: OTHER, resourceId: POST, resourceType: 'post', ts },
];

describe('advanceLease', () => {
  it('finds the copy fresh on a first answer and behind on any later one', () => {
    const first = advanceLease(INITIAL_TRACK, mine);
    expect(first).toMatchObject({ answered: true, syncing: false, sync: 0 });

    const waited = advanceLease(advanceLease(INITIAL_TRACK, theirs), { ...mine });
    expect(waited).toMatchObject({ syncing: true, sync: 1, holder: OTHER, lost: false });

    const recovered = advanceLease(advanceLease(first, null), { ...mine });
    expect(recovered).toMatchObject({ syncing: true, sync: 1 });
  });

  it('marks the lease lost only for a tab that held it', () => {
    expect(advanceLease(INITIAL_TRACK, theirs).lost).toBe(false);
    expect(advanceLease(advanceLease(INITIAL_TRACK, mine), theirs).lost).toBe(true);
  });
});

describe('useEditLease', () => {
  const setup = (lease: LeaseStatus, dirty = false) => {
    const ports = {
      isDirty: vi.fn(() => dirty),
      flush: vi.fn(),
      reload: vi.fn().mockResolvedValue('reloaded'),
    };
    const hook = renderHook(
      (props: { lease: LeaseStatus; active: ActivePresence[] }) =>
        useEditLease({ ...props, currentUserId: ME, ...ports }),
      { initialProps: { lease, active: [] as ActivePresence[] } },
    );
    return { hook, ports };
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('leaves the editor alone when there is no lease, and waits while the answer is pending', () => {
    expect(setup(null).hook.result.current).toEqual({ locked: false });
    expect(setup('pending').hook.result.current).toEqual({ locked: true, reason: 'pending' });
  });

  it('opens at once for the tab the first answer names, without reading again', async () => {
    const { hook, ports } = setup('pending');
    hook.rerender({ lease: mine, active: [] });
    await act(() => vi.advanceTimersByTimeAsync(TAKEOVER_MAX_MS));
    expect(hook.result.current).toEqual({ locked: false });
    expect(ports.reload).not.toHaveBeenCalled();
  });

  it('says who holds the document, and whether that is another of the writer’s tabs', () => {
    expect(setup(theirs).hook.result.current).toEqual({
      locked: true,
      reason: 'held',
      userId: OTHER,
      ownTab: false,
      lost: false,
    });
    expect(setup({ userId: ME, mine: false }).hook.result.current).toMatchObject({ ownTab: true });
  });

  it('reads the latest copy before opening when the holder leaves', async () => {
    const { hook, ports } = setup(theirs);
    hook.rerender({ lease: { ...mine }, active: [] });
    expect(hook.result.current).toEqual({ locked: true, reason: 'pending' });
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(ports.reload).toHaveBeenCalledTimes(1);
    expect(hook.result.current).toEqual({ locked: false });
  });

  it('keeps unsaved work rather than read over it', async () => {
    const { hook, ports } = setup(theirs, true);
    hook.rerender({ lease: { ...mine }, active: [] });
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(ports.reload).not.toHaveBeenCalled();
    expect(hook.result.current).toEqual({ locked: false });
  });

  it('waits after a takeover until the holder has polled, then for its last save', async () => {
    const { hook, ports } = setup(theirs);
    const taken = { ...mine, takenAt: 5_000 };
    hook.rerender({ lease: taken, active: present(4_000) });
    expect(hook.result.current).toEqual({ locked: true, reason: 'taking' });
    await act(() => vi.advanceTimersByTimeAsync(TAKEOVER_GRACE_MS + 1_000));
    expect(ports.reload).not.toHaveBeenCalled();

    hook.rerender({ lease: taken, active: present(6_000) });
    await act(() => vi.advanceTimersByTimeAsync(TAKEOVER_GRACE_MS - 1));
    expect(ports.reload).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(ports.reload).toHaveBeenCalledTimes(1);
    expect(hook.result.current).toEqual({ locked: false });
  });

  it('waits only the grace period when the holder has already gone', async () => {
    const { hook, ports } = setup(theirs);
    hook.rerender({ lease: { ...mine, takenAt: 5_000 }, active: [] });
    await act(() => vi.advanceTimersByTimeAsync(TAKEOVER_GRACE_MS));
    expect(ports.reload).toHaveBeenCalledTimes(1);
    expect(hook.result.current).toEqual({ locked: false });
  });

  it('gives up waiting on a holder that never polls again', async () => {
    const { hook, ports } = setup(theirs);
    hook.rerender({ lease: { ...mine, takenAt: 5_000 }, active: present(4_000) });
    await act(() => vi.advanceTimersByTimeAsync(TAKEOVER_MAX_MS - 1));
    expect(hook.result.current).toEqual({ locked: true, reason: 'taking' });
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(ports.reload).toHaveBeenCalledTimes(1);
    expect(hook.result.current).toEqual({ locked: false });
  });

  it('saves the draft at once and locks when another tab takes the lease', async () => {
    const { hook, ports } = setup(mine);
    expect(hook.result.current).toEqual({ locked: false });
    hook.rerender({ lease: theirs, active: present(1_000) });
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(ports.flush).toHaveBeenCalledTimes(1);
    expect(hook.result.current).toMatchObject({ locked: true, reason: 'held', lost: true });

    hook.rerender({ lease: { ...mine, takenAt: 9_000 }, active: [] });
    await act(() => vi.advanceTimersByTimeAsync(TAKEOVER_GRACE_MS));
    expect(hook.result.current).toEqual({ locked: false });
    expect(ports.flush).toHaveBeenCalledTimes(1);
  });

  it('stays locked when the lease moves on again during a takeover', async () => {
    const { hook, ports } = setup(theirs);
    hook.rerender({ lease: { ...mine, takenAt: 5_000 }, active: present(4_000) });
    hook.rerender({ lease: theirs, active: present(6_000) });
    await act(() => vi.advanceTimersByTimeAsync(TAKEOVER_MAX_MS));
    expect(ports.reload).not.toHaveBeenCalled();
    expect(hook.result.current).toMatchObject({ locked: true, reason: 'held' });
  });
});
