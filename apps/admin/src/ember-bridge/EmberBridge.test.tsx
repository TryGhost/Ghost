import { act } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, beforeEach, afterEach, vi, test as baseTest } from "vitest";
import { queryClientFixtures, type TestWrapperComponent } from "@test-utils/fixtures/query-client";
import type { QueryClient } from "@tanstack/react-query";
import type { StateBridge, StateBridgeEventMap } from "./EmberBridge";

const queryTest = baseTest.extend<{
    queryClient: QueryClient;
    wrapper: TestWrapperComponent;
}>(queryClientFixtures);

type EmberEvent = keyof StateBridgeEventMap;
type EventPayload<K extends EmberEvent> = StateBridgeEventMap[K];
type ListenerMap = {
    [K in EmberEvent]?: Array<(payload: EventPayload<K>) => void>;
};

function createMockStateBridge() {
    const listeners: ListenerMap = {};

    const on = vi.fn(<K extends EmberEvent>(event: K, callback: (payload: EventPayload<K>) => void) => {
        listeners[event] = [...(listeners[event] ?? []), callback];
    });

    const off = vi.fn(<K extends EmberEvent>(event: K, callback: (payload: EventPayload<K>) => void) => {
        listeners[event] = (listeners[event] ?? []).filter((listener) => listener !== callback);
    });

    const emit = <K extends EmberEvent>(event: K, payload: EventPayload<K>) => {
        const eventListeners = listeners[event] as Array<(value: EventPayload<K>) => void> | undefined;
        eventListeners?.forEach((listener) => listener(payload));
    };

    const stateBridge: StateBridge = {
        onUpdate: vi.fn(),
        onInvalidate: vi.fn(),
        onDelete: vi.fn(),
        on: on as StateBridge['on'],
        off: off as StateBridge['off'],
    };

    return {
        stateBridge,
        emit,
        onSpy: on,
    };
}

let useEmberDataSync: typeof import('./EmberBridge').useEmberDataSync;
type EmberBridgeWindow = typeof window & { EmberBridge?: { state: StateBridge } };
const windowWithBridge = window as EmberBridgeWindow;

beforeEach(async () => {
    vi.resetModules();
    vi.useRealTimers();
    ({ useEmberDataSync } = await import('./EmberBridge'));
    delete windowWithBridge.EmberBridge;
});

afterEach(() => {
    delete windowWithBridge.EmberBridge;
    vi.clearAllTimers();
    vi.useRealTimers();
});

describe('useEmberDataSync', () => {
    queryTest('invalidates queries for mapped Ember models', async ({ queryClient, wrapper }) => {
        const mock = createMockStateBridge();
        windowWithBridge.EmberBridge = { state: mock.stateBridge };

        queryClient.setQueryData(['PostsResponseType', '/posts'], { posts: [] });
        queryClient.setQueryData(['PostsResponseType', '/posts/123'], { posts: [{ id: '123' }] });
        queryClient.setQueryData(['MembersResponseType', '/members'], { members: [] });
        queryClient.setQueryData(['UsersResponseType', '/users'], { users: [] });

        const { unmount } = renderHook(() => useEmberDataSync(), { wrapper });

        await waitFor(() => {
            expect(mock.onSpy).toHaveBeenCalledWith('emberDataChange', expect.any(Function));
        });

        act(() => {
            mock.emit('emberDataChange', {
                operation: 'update',
                modelName: 'post',
                id: '1',
                data: null,
            });
        });

        await waitFor(() => {
            const queries = queryClient.getQueryCache().getAll();
            const postsQueries = queries.filter(q => q.queryKey[0] === 'PostsResponseType');
            const nonPostsQueries = queries.filter(q => q.queryKey[0] !== 'PostsResponseType');

            expect(postsQueries.every(q => q.state.isInvalidated)).toBe(true);
            expect(nonPostsQueries.every(q => !q.state.isInvalidated)).toBe(true);
        });

        unmount();
    });

    queryTest('ignores unmapped Ember models', async ({ queryClient, wrapper }) => {
        const mock = createMockStateBridge();
        windowWithBridge.EmberBridge = { state: mock.stateBridge };
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        renderHook(() => useEmberDataSync(), { wrapper });

        await waitFor(() => {
            expect(mock.onSpy).toHaveBeenCalledWith('emberDataChange', expect.any(Function));
        });

        act(() => {
            mock.emit('emberDataChange', {
                operation: 'update',
                modelName: 'unknown-model',
                id: '1',
                data: null,
            });
        });

        expect(invalidateSpy).not.toHaveBeenCalled();
    });

    queryTest('does not subscribe if unmounted before the bridge becomes available', async ({ wrapper }) => {
        vi.useFakeTimers();
        const mock = createMockStateBridge();

        const { unmount } = renderHook(() => useEmberDataSync(), { wrapper });
        unmount();

        windowWithBridge.EmberBridge = { state: mock.stateBridge };

        await vi.advanceTimersByTimeAsync(200);

        expect(mock.onSpy).not.toHaveBeenCalled();
    });
});
