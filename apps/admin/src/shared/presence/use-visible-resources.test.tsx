import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVisibleResources } from './use-visible-resources';
import type { PresenceResource } from './presence-api';

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  readonly observed = new Set<Element>();
  private readonly callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    FakeIntersectionObserver.instances.push(this);
  }
  observe(element: Element) {
    this.observed.add(element);
  }
  unobserve(element: Element) {
    this.observed.delete(element);
  }
  disconnect() {
    this.observed.clear();
  }
  intersect(element: Element, isIntersecting: boolean) {
    this.callback(
      [{ target: element, isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

const row = (id: string) => {
  const element = document.createElement('li');
  element.setAttribute('data-presence-id', id);
  return element;
};
const POST_A = 'a'.repeat(24);
const POST_B = 'b'.repeat(24);
const resources: PresenceResource[] = [
  { id: POST_A, type: 'post' },
  { id: POST_B, type: 'post' },
];

describe('useVisibleResources', () => {
  let root: HTMLDivElement;
  // Stable across renders, as a component's useRef object is.
  let ref: { current: HTMLDivElement };
  beforeEach(() => {
    vi.useFakeTimers();
    FakeIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    root = document.createElement('div');
    document.body.appendChild(root);
    ref = { current: root };
  });
  afterEach(() => {
    root.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('reports rows that are on screen, in id order, after a short debounce', async () => {
    const a = row(POST_A);
    const b = row(POST_B);
    root.append(b, a);
    const hook = renderHook(() => useVisibleResources(ref, resources, true));
    const [observer] = FakeIntersectionObserver.instances;
    expect(observer.observed.size).toBe(2);
    act(() => {
      observer.intersect(b, true);
      observer.intersect(a, true);
    });
    expect(hook.result.current).toEqual([]);
    await act(() => vi.advanceTimersByTimeAsync(250));
    expect(hook.result.current).toEqual(resources);
    act(() => observer.intersect(a, false));
    await act(() => vi.advanceTimersByTimeAsync(250));
    expect(hook.result.current).toEqual([resources[1]]);
    hook.unmount();
  });

  it('picks up rows that mount after the hook, as a list does when its rows render late', async () => {
    const hook = renderHook(() => useVisibleResources(ref, resources, true));
    const [observer] = FakeIntersectionObserver.instances;
    expect(observer.observed.size).toBe(0);
    const a = row(POST_A);
    root.appendChild(a);
    // MutationObserver callbacks are microtasks.
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(observer.observed.has(a)).toBe(true);
    act(() => observer.intersect(a, true));
    await act(() => vi.advanceTimersByTimeAsync(250));
    expect(hook.result.current).toEqual([resources[0]]);
    a.remove();
    // The mutation callback is a microtask; the debounce starts after it runs.
    await act(() => vi.advanceTimersByTimeAsync(0));
    await act(() => vi.advanceTimersByTimeAsync(250));
    expect(hook.result.current).toEqual([]);
    hook.unmount();
  });

  it('does nothing while disabled', async () => {
    root.appendChild(row(POST_A));
    const hook = renderHook(() => useVisibleResources(ref, resources, false));
    await act(() => vi.advanceTimersByTimeAsync(250));
    expect(FakeIntersectionObserver.instances).toHaveLength(0);
    expect(hook.result.current).toEqual([]);
    hook.unmount();
  });
});
