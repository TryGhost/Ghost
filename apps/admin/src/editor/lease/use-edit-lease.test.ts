import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivePresence } from '@/shared/presence/presence-api';
import type { LeaseStatus } from '@/shared/presence/use-presence';
import {
  INITIAL_TRACK,
  RACE_WINDOW_MS,
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

  it('forgets an outdated copy once someone else holds the lease', () => {
    const outdated = { ...advanceLease(INITIAL_TRACK, mine), outdated: true };
    expect(advanceLease(outdated, theirs).outdated).toBe(false);
  });

  it('finds a free document ready as it was read, and behind once someone has held it', () => {
    expect(advanceLease(INITIAL_TRACK, 'free')).toMatchObject({
      answered: true,
      syncing: false,
      sync: 0,
    });
    const released = advanceLease(advanceLease(INITIAL_TRACK, theirs), 'free');
    expect(released).toMatchObject({ syncing: true, sync: 1, lost: false });
  });

  it('counts taking a free lease, and finding a free one held after all', () => {
    const free = advanceLease(INITIAL_TRACK, 'free');
    expect(advanceLease(free, mine)).toMatchObject({ claims: 1, beaten: 0, syncing: false });
    expect(advanceLease(free, theirs)).toMatchObject({ claims: 0, beaten: 1 });
    // A lease this tab held and lost was not found free.
    expect(advanceLease(advanceLease(INITIAL_TRACK, mine), theirs)).toMatchObject({ beaten: 0 });
    expect(advanceLease(advanceLease(INITIAL_TRACK, theirs), { ...mine })).toMatchObject({
      claims: 0,
    });
  });
});

describe('useEditLease', () => {
  const setup = (lease: LeaseStatus, dirty = false) => {
    const ports = {
      isDirty: vi.fn(() => dirty),
      flush: vi.fn(),
      reload: vi.fn().mockResolvedValue('reloaded'),
      hasNewerVersion: vi.fn().mockResolvedValue(false),
      revert: vi.fn(() => true),
      onBehind: vi.fn(),
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
      raced: false,
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

  it('keeps unsaved work rather than read over it, and opens when nothing was saved meanwhile', async () => {
    const { hook, ports } = setup(theirs, true);
    hook.rerender({ lease: { ...mine }, active: [] });
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(ports.hasNewerVersion).toHaveBeenCalledTimes(1);
    expect(ports.reload).not.toHaveBeenCalled();
    expect(hook.result.current).toEqual({ locked: false });
  });

  it('stays locked over a version saved meanwhile until the unsaved work is gone', async () => {
    const { hook, ports } = setup(theirs, true);
    ports.hasNewerVersion.mockResolvedValue(true);
    const held = { ...mine };
    hook.rerender({ lease: held, active: [] });
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(ports.reload).not.toHaveBeenCalled();
    expect(hook.result.current).toEqual({ locked: true, reason: 'outdated' });

    // The writer's own reload is what leaves nothing unsaved.
    ports.isDirty.mockReturnValue(false);
    hook.rerender({ lease: held, active: [] });
    expect(hook.result.current).toEqual({ locked: false });
  });

  it('checks again each time it takes the lease back with unsaved work', async () => {
    const { hook, ports } = setup(theirs, true);
    ports.hasNewerVersion.mockResolvedValue(true);
    hook.rerender({ lease: { ...mine }, active: [] });
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(hook.result.current).toEqual({ locked: true, reason: 'outdated' });

    hook.rerender({ lease: theirs, active: [] });
    expect(hook.result.current).toMatchObject({ locked: true, reason: 'held' });

    ports.hasNewerVersion.mockResolvedValue(false);
    hook.rerender({ lease: { ...mine }, active: [] });
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(ports.hasNewerVersion).toHaveBeenCalledTimes(2);
    expect(hook.result.current).toEqual({ locked: false });
  });

  it('waits the longest after a takeover while the holder is on the document, whatever it has sent since', async () => {
    const { hook, ports } = setup(theirs);
    const taken = { ...mine, takenAt: 5_000 };
    hook.rerender({ lease: taken, active: present(4_000) });
    expect(hook.result.current).toEqual({ locked: true, reason: 'taking' });
    // A later heartbeat can be another of the holder's tabs, so it is no sign the holder heard.
    hook.rerender({ lease: taken, active: present(6_000) });
    await act(() => vi.advanceTimersByTimeAsync(TAKEOVER_MAX_MS - 1));
    expect(ports.reload).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(ports.reload).toHaveBeenCalledTimes(1);
    expect(hook.result.current).toEqual({ locked: false });
  });

  it('waits the longest after taking over from the writer’s own other tab, which is never listed', async () => {
    const { hook, ports } = setup({ userId: ME, mine: false });
    hook.rerender({ lease: { ...mine, takenAt: 5_000 }, active: [] });
    await act(() => vi.advanceTimersByTimeAsync(TAKEOVER_MAX_MS - 1));
    expect(ports.reload).not.toHaveBeenCalled();
    expect(hook.result.current).toEqual({ locked: true, reason: 'taking' });
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

  it('leaves a document nobody holds open for editing', async () => {
    const { hook, ports } = setup('pending');
    hook.rerender({ lease: 'free', active: [] });
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(hook.result.current).toEqual({ locked: false });
    expect(ports.reload).not.toHaveBeenCalled();
  });

  it('reads the latest copy before opening once the holder has left it free', async () => {
    const { hook, ports } = setup(theirs);
    hook.rerender({ lease: 'free', active: [] });
    expect(hook.result.current).toEqual({ locked: true, reason: 'pending' });
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(ports.reload).toHaveBeenCalledTimes(1);
    expect(hook.result.current).toEqual({ locked: false });
  });

  it('checks its copy when it takes a free lease, and keeps what it typed when the copy is the latest', async () => {
    const { hook, ports } = setup('free', true);
    hook.rerender({ lease: mine, active: [] });
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(ports.hasNewerVersion).toHaveBeenCalledTimes(1);
    expect(ports.reload).not.toHaveBeenCalled();
    expect(ports.onBehind).not.toHaveBeenCalled();
    expect(hook.result.current).toEqual({ locked: false });
  });

  it('loads the latest over what it typed when it took a free lease on an older copy', async () => {
    const { hook, ports } = setup('free', true);
    ports.hasNewerVersion.mockResolvedValue(true);
    hook.rerender({ lease: mine, active: [] });
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(ports.reload).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ discardUnsaved: true }),
    );
    expect(ports.onBehind).toHaveBeenCalledTimes(1);
  });

  it('leaves unsaved work alone when the lease is lost while its copy is still being checked', async () => {
    const { hook, ports } = setup('free', true);
    let answer!: (newer: boolean) => void;
    ports.hasNewerVersion.mockReturnValue(
      new Promise<boolean>((resolve) => {
        answer = resolve;
      }),
    );
    hook.rerender({ lease: mine, active: [] });
    await act(() => vi.advanceTimersByTimeAsync(0));

    // Another tab takes over before the check comes back.
    hook.rerender({ lease: theirs, active: [] });
    await act(async () => {
      answer(true);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(ports.reload).not.toHaveBeenCalled();
    expect(ports.onBehind).not.toHaveBeenCalled();
    expect(hook.result.current).toMatchObject({ locked: true, reason: 'held', lost: true });
  });

  it('calls off loading the latest copy when the lease is lost while it is being read', async () => {
    const { hook, ports } = setup('free', true);
    ports.hasNewerVersion.mockResolvedValue(true);
    let finish!: (outcome: string) => void;
    ports.reload.mockReturnValue(
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
    );
    hook.rerender({ lease: mine, active: [] });
    await act(() => vi.advanceTimersByTimeAsync(0));
    const [options] = ports.reload.mock.calls[0] as [{ onlyIf: () => boolean }];
    expect(options.onlyIf()).toBe(true);

    hook.rerender({ lease: theirs, active: [] });
    expect(options.onlyIf()).toBe(false);
    await act(async () => {
      finish('abandoned');
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(ports.onBehind).not.toHaveBeenCalled();
  });

  describe('when a free lease turns out to be someone else’s', () => {
    /** Free, then typing begins, then `afterMs` later the answer names another holder. */
    const beatenAfter = async (afterMs: number, revertWorks = true) => {
      const { hook, ports } = setup('free');
      ports.revert.mockReturnValue(revertWorks);
      ports.isDirty.mockReturnValue(true);
      hook.rerender({ lease: 'free', active: [] });
      await act(() => vi.advanceTimersByTimeAsync(afterMs));
      hook.rerender({ lease: theirs, active: [] });
      await act(() => vi.advanceTimersByTimeAsync(0));
      return { hook, ports };
    };

    it('puts back what was typed a moment ago, locks, and says so', async () => {
      const { hook, ports } = await beatenAfter(200);
      expect(ports.revert).toHaveBeenCalledTimes(1);
      expect(ports.reload).not.toHaveBeenCalled();
      expect(hook.result.current).toMatchObject({ locked: true, reason: 'held', raced: true });
    });

    it('reads the server’s copy when the loaded one cannot be put back', async () => {
      const { ports } = await beatenAfter(200, false);
      expect(ports.reload).toHaveBeenCalledExactlyOnceWith({ discardUnsaved: true });
    });

    it('keeps work that is older than a moment', async () => {
      const { hook, ports } = await beatenAfter(RACE_WINDOW_MS + 1);
      expect(ports.revert).not.toHaveBeenCalled();
      expect(ports.reload).not.toHaveBeenCalled();
      expect(hook.result.current).toMatchObject({ locked: true, reason: 'held', raced: false });
    });

    it('has nothing to put back in a tab that was only reading', async () => {
      const { hook, ports } = setup('free');
      hook.rerender({ lease: theirs, active: [] });
      await act(() => vi.advanceTimersByTimeAsync(0));
      expect(ports.revert).not.toHaveBeenCalled();
      expect(hook.result.current).toMatchObject({ locked: true, reason: 'held', raced: false });
    });
  });

  it('keeps unsaved work when a lease it held is taken, rather than putting it back', async () => {
    const { hook, ports } = setup(mine, true);
    hook.rerender({ lease: theirs, active: [] });
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(ports.revert).not.toHaveBeenCalled();
    expect(hook.result.current).toMatchObject({ lost: true, raced: false });
  });
});
