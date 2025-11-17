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

function createMockStateBridge(sidebarVisible = true) {
    const listeners: Partial<Record<EmberEvent, Array<(payload: unknown) => void>>> = {};

    const on = vi.fn(<K extends EmberEvent>(event: K, callback: (payload: EventPayload<K>) => void) => {
        if (!listeners[event]) {
            listeners[event] = [];
        }
        listeners[event].push(callback as (payload: unknown) => void);
    });

    const off = vi.fn(<K extends EmberEvent>(event: K, callback: (payload: EventPayload<K>) => void) => {
        if (!listeners[event]) {
            return;
        }
        listeners[event] = listeners[event].filter((listener) => listener !== callback);
    });

    const emit = <K extends EmberEvent>(event: K, payload: EventPayload<K>) => {
        const eventListeners = listeners[event];
        eventListeners?.forEach((listener) => listener(payload));
    };

    const stateBridge: StateBridge = {
        onUpdate: vi.fn(),
        onInvalidate: vi.fn(),
        onDelete: vi.fn(),
        on: on as StateBridge['on'],
        off: off as StateBridge['off'],
        sidebarVisible,
    };

    return {
        stateBridge,
        emit,
        onSpy: on,
    };
}

let useEmberDataSync: typeof import('./EmberBridge').useEmberDataSync;
let useEmberAuthSync: typeof import('./EmberBridge').useEmberAuthSync;
let useSidebarVisibility: typeof import('./EmberBridge').useSidebarVisibility;
type EmberBridgeWindow = typeof window & { EmberBridge?: { state: StateBridge } };
const windowWithBridge = window as EmberBridgeWindow;

beforeEach(async () => {
    vi.resetModules();
    vi.useRealTimers();
    ({ useEmberDataSync, useEmberAuthSync, useSidebarVisibility } = await import('./EmberBridge'));
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

describe('useEmberAuthSync', () => {
    queryTest('invalidates all queries when auth changes', async ({ queryClient, wrapper }) => {
        const mock = createMockStateBridge();
        windowWithBridge.EmberBridge = { state: mock.stateBridge };

        queryClient.setQueryData(['PostsResponseType', '/posts'], { posts: [] });
        queryClient.setQueryData(['MembersResponseType', '/members'], { members: [] });
        queryClient.setQueryData(['UsersResponseType', '/users'], { users: [] });

        const { unmount } = renderHook(() => useEmberAuthSync(), { wrapper });

        await waitFor(() => {
            expect(mock.onSpy).toHaveBeenCalledWith('emberAuthChange', expect.any(Function));
        });

        act(() => {
            mock.emit('emberAuthChange', {
                isAuthenticated: true,
            });
        });

        await waitFor(() => {
            const queries = queryClient.getQueryCache().getAll();
            expect(queries.every(q => q.state.isInvalidated)).toBe(true);
        });

        unmount();
    });
});

describe('useSidebarVisibility', () => {
    baseTest('returns true when EmberBridge is not available', () => {
        const { result } = renderHook(() => useSidebarVisibility());

        expect(result.current).toBe(true);
    });

    baseTest('reads sidebar visibility from Ember state', () => {
        const mock = createMockStateBridge(false);
        windowWithBridge.EmberBridge = { state: mock.stateBridge };

        const { result } = renderHook(() => useSidebarVisibility());

        expect(result.current).toBe(false);
    });

    baseTest('updates when Ember emits sidebarVisibilityChange event', async () => {
        const mock = createMockStateBridge(true);
        windowWithBridge.EmberBridge = { state: mock.stateBridge };

        const { result } = renderHook(() => useSidebarVisibility());

        expect(result.current).toBe(true);

        await waitFor(() => {
            expect(mock.onSpy).toHaveBeenCalledWith('sidebarVisibilityChange', expect.any(Function));
        });

        // Update the mock state and emit event
        mock.stateBridge.sidebarVisible = false;
        act(() => {
            mock.emit('sidebarVisibilityChange', { isVisible: false });
        });

        await waitFor(() => {
            expect(result.current).toBe(false);
        });
    });

    baseTest('updates from false to true', async () => {
        const mock = createMockStateBridge(false);
        windowWithBridge.EmberBridge = { state: mock.stateBridge };

        const { result } = renderHook(() => useSidebarVisibility());

        expect(result.current).toBe(false);

        await waitFor(() => {
            expect(mock.onSpy).toHaveBeenCalledWith('sidebarVisibilityChange', expect.any(Function));
        });

        // Update the mock state and emit event
        mock.stateBridge.sidebarVisible = true;
        act(() => {
            mock.emit('sidebarVisibilityChange', { isVisible: true });
        });

        await waitFor(() => {
            expect(result.current).toBe(true); 
        });
    });

    baseTest('reads latest Ember state on each render', () => {
        const mock = createMockStateBridge(true);
        windowWithBridge.EmberBridge = { state: mock.stateBridge };

        const { result, rerender } = renderHook(() => useSidebarVisibility());

        expect(result.current).toBe(true);

        // Change Ember state without emitting event
        mock.stateBridge.sidebarVisible = false;

        // Force a re-render
        rerender();

        // Should read the new state from Ember
        expect(result.current).toBe(false);
    });

    baseTest('does not subscribe if unmounted before bridge becomes available', async () => {
        vi.useFakeTimers();
        const mock = createMockStateBridge(true);

        const { unmount } = renderHook(() => useSidebarVisibility());
        unmount();

        windowWithBridge.EmberBridge = { state: mock.stateBridge };

        await vi.advanceTimersByTimeAsync(200);

        expect(mock.onSpy).not.toHaveBeenCalled();
    });
});
