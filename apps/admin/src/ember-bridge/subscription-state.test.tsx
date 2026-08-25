import { act } from 'react';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StateBridge, StateBridgeEventMap, SubscriptionState } from './ember-bridge';

type SubscriptionListener = (state: SubscriptionState) => void;

function createStateBridge(subscriptionState: SubscriptionState | null): StateBridge & {
  emitSubscriptionChange: (state: SubscriptionState) => void;
  offSpy: ReturnType<typeof vi.fn>;
} {
  let listener: SubscriptionListener | null = null;
  const offSpy = vi.fn();

  return {
    subscriptionState,
    onUpdate: vi.fn(),
    onInvalidate: vi.fn(),
    onDelete: vi.fn(),
    on: vi.fn(
      <K extends keyof StateBridgeEventMap>(
        event: K,
        callback: (payload: StateBridgeEventMap[K]) => void,
      ) => {
        if (event === 'subscriptionChange') {
          listener = callback as SubscriptionListener;
        }
      },
    ),
    off: offSpy,
    offSpy,
    sidebarVisible: true,
    getRouteUrl: vi.fn(),
    isRouteActive: vi.fn(),
    emitSubscriptionChange(state) {
      this.subscriptionState = state;
      listener?.(state);
    },
  };
}

function overdueSnapshot(): SubscriptionState {
  return {
    isGrace: true,
    subscription: {
      status: 'past_due',
      paymentAttempts: 3,
      forceUpgrade: false,
    },
  };
}

let useSubscriptionStatus: typeof import('./ember-bridge').useSubscriptionStatus;

beforeEach(async () => {
  vi.resetModules();
  ({ useSubscriptionStatus } = await import('./ember-bridge'));
});

afterEach(() => {
  delete window.EmberBridge;
  vi.useRealTimers();
});

describe('useSubscriptionStatus', () => {
  it('reads a subscription snapshot published before React subscribes', () => {
    const snapshot = overdueSnapshot();
    const stateBridge = createStateBridge(snapshot);
    window.EmberBridge = { state: stateBridge };

    const { result } = renderHook(() => useSubscriptionStatus());

    expect(result.current).toBe(snapshot);
  });

  it('updates from later subscription changes', () => {
    const stateBridge = createStateBridge(null);
    window.EmberBridge = { state: stateBridge };
    const { result } = renderHook(() => useSubscriptionStatus());

    act(() => {
      stateBridge.emitSubscriptionChange({
        isGrace: true,
        subscription: {
          status: 'unpaid',
          paymentAttempts: 4,
          forceUpgrade: false,
        },
      });
    });

    expect(result.current).toEqual({
      isGrace: true,
      subscription: {
        status: 'unpaid',
        paymentAttempts: 4,
        forceUpgrade: false,
      },
    });
  });

  it('reads the current snapshot when the Ember bridge becomes available after mounting', async () => {
    vi.useFakeTimers();
    const snapshot = overdueSnapshot();
    const { result } = renderHook(() => useSubscriptionStatus());

    expect(result.current).toBeNull();

    window.EmberBridge = { state: createStateBridge(snapshot) };
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current).toBe(snapshot);
  });

  it('unsubscribes from subscription changes on unmount', () => {
    const stateBridge = createStateBridge(overdueSnapshot());
    window.EmberBridge = { state: stateBridge };

    const { unmount } = renderHook(() => useSubscriptionStatus());
    unmount();

    expect(stateBridge.offSpy).toHaveBeenCalledWith('subscriptionChange', expect.any(Function));
  });
});
