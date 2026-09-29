import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getListReturnNavigationState, rememberListReturnState } from './list-return-state';
import { useScrollRestoration } from './use-scroll-restoration';

const { location } = vi.hoisted(() => ({
  location: { pathname: '/posts', search: '', key: 'initial' },
}));
vi.mock('@tryghost/admin-x-framework', () => ({ useLocation: () => location }));

let originalHistoryState: unknown;
let scrollContainer: HTMLDivElement;
let entry = 0;

beforeEach(() => {
  vi.useFakeTimers();
  originalHistoryState = window.history.state as unknown;
  location.pathname = '/posts';
  location.search = '';
  entry += 1;
  location.key = `entry-${entry}`;
  window.history.replaceState({ key: location.key }, '');
  scrollContainer = document.createElement('div');
  Object.defineProperties(scrollContainer, {
    scrollHeight: { value: 3000 },
    clientHeight: { value: 500 },
  });
});

afterEach(() => {
  cleanup();
  window.history.replaceState(originalHistoryState, '');
  vi.useRealTimers();
});

function mount(resetOnNavigation = false) {
  const parentRef = { current: scrollContainer };
  const getScrollElement = () => scrollContainer;
  return renderHook(() => useScrollRestoration({ parentRef, getScrollElement, resetOnNavigation }));
}

describe('list scroll restoration', () => {
  it('replaces a stale breadcrumb position even when a fresh list is already at the top', () => {
    rememberListReturnState('/posts', { scrollPosition: 1500 });
    mount(true);
    expect(getListReturnNavigationState('/posts')?.listReturn.scrollPosition).toBe(0);
  });

  it.each(['back', 'breadcrumb'])('restores %s after the list mounts', async (returnWith) => {
    rememberListReturnState('/posts', { scrollPosition: 1500 });
    const state =
      returnWith === 'back'
        ? { ghostVirtualListScrollPosition: { '/posts': 1500 } }
        : { usr: getListReturnNavigationState('/posts') };
    window.history.replaceState({ key: location.key, ...state }, '');
    mount(true);
    await act(() => vi.advanceTimersByTimeAsync(150));
    expect(scrollContainer.scrollTop).toBe(1500);
  });

  it('replaces stale breadcrumb state when Back restores an entry already at zero', async () => {
    rememberListReturnState('/posts', { scrollPosition: 1500 });
    window.history.replaceState(
      { key: location.key, ghostVirtualListScrollPosition: { '/posts': 0 } },
      '',
    );
    mount(true);
    await act(() => vi.advanceTimersByTimeAsync(150));
    expect(getListReturnNavigationState('/posts')?.listReturn.scrollPosition).toBe(0);
  });

  it('resets a new sidebar entry even if its URL is unchanged', async () => {
    const { rerender } = mount(true);
    scrollContainer.scrollTop = 1500;
    await act(() => scrollContainer.dispatchEvent(new Event('scroll')));
    entry += 1;
    location.key = `entry-${entry}`;
    window.history.replaceState({ key: location.key }, '');
    rerender();
    expect(scrollContainer.scrollTop).toBe(0);
    expect(getListReturnNavigationState('/posts')?.listReturn.scrollPosition).toBe(0);
  });

  it('keeps in-place Comments thread navigation at its existing position', () => {
    location.pathname = '/comments';
    const { rerender } = mount();
    scrollContainer.scrollTop = 1500;
    location.search = '?thread=123';
    entry += 1;
    location.key = `entry-${entry}`;
    window.history.replaceState({ key: location.key }, '');
    rerender();
    expect(scrollContainer.scrollTop).toBe(1500);
  });
});
