import {act} from 'react';
import {renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {StateBridge, StateBridgeEventMap, SubscriptionState} from './ember-bridge';

type SubscriptionListener = (state: SubscriptionState) => void;

function createStateBridge(subscriptionState: SubscriptionState | null): StateBridge & {emitSubscriptionChange: (state: SubscriptionState) => void} {
    let listener: SubscriptionListener | null = null;

    return {
        subscriptionState,
        onUpdate: vi.fn(),
        onInvalidate: vi.fn(),
        onDelete: vi.fn(),
        on: vi.fn(<K extends keyof StateBridgeEventMap>(event: K, callback: (payload: StateBridgeEventMap[K]) => void) => {
            if (event === 'subscriptionChange') {
                listener = callback as SubscriptionListener;
            }
        }),
        off: vi.fn(),
        sidebarVisible: true,
        getRouteUrl: vi.fn(),
        isRouteActive: vi.fn(),
        emitSubscriptionChange(state) {
            this.subscriptionState = state;
            listener?.(state);
        }
    };
}

let useSubscriptionStatus: typeof import('./ember-bridge').useSubscriptionStatus;

beforeEach(async () => {
    vi.resetModules();
    ({useSubscriptionStatus} = await import('./ember-bridge'));
});

afterEach(() => {
    delete window.EmberBridge;
});

describe('useSubscriptionStatus', () => {
    it('reads a subscription snapshot published before React subscribes', () => {
        const snapshot: SubscriptionState = {
            subscription: {
                status: 'past_due',
                paymentAttempts: 3,
                forceUpgrade: false
            }
        };
        const stateBridge = createStateBridge(snapshot);
        window.EmberBridge = {state: stateBridge};

        const {result} = renderHook(() => useSubscriptionStatus());

        expect(result.current).toBe(snapshot);
    });

    it('updates from later subscription changes', () => {
        const stateBridge = createStateBridge(null);
        window.EmberBridge = {state: stateBridge};
        const {result} = renderHook(() => useSubscriptionStatus());

        act(() => {
            stateBridge.emitSubscriptionChange({
                subscription: {
                    status: 'unpaid',
                    paymentAttempts: 4,
                    forceUpgrade: false
                }
            });
        });

        expect(result.current).toEqual({
            subscription: {
                status: 'unpaid',
                paymentAttempts: 4,
                forceUpgrade: false
            }
        });
    });
});
