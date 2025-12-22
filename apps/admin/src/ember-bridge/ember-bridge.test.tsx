import { act } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, beforeEach, afterEach, vi, test as baseTest } from "vitest";
import { queryClientFixtures, type TestWrapperComponent } from "@test-utils/fixtures/query-client";
import type { QueryClient } from "@tanstack/react-query";
import type { StateBridge, StateBridgeEventMap } from "./ember-bridge";

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
        getRouteUrl: vi.fn(),
        isRouteActive: vi.fn(),
    };

    return {
        stateBridge,
        emit,
        onSpy: on,
    };
}

declare global {
    interface Window {
        EmberBridge?: { state: StateBridge };
    }
}

let useEmberDataSync: typeof import('./ember-bridge').useEmberDataSync;
let useEmberAuthSync: typeof import('./ember-bridge').useEmberAuthSync;
let useSidebarVisibility: typeof import('./ember-bridge').useSidebarVisibility;
let useEmberRouting: typeof import('./ember-bridge').useEmberRouting;

beforeEach(async () => {
    vi.resetModules();
    vi.useRealTimers();
    ({ useEmberDataSync, useEmberAuthSync, useSidebarVisibility, useEmberRouting } = await import('./ember-bridge'));
    delete window.EmberBridge;
});

afterEach(() => {
    delete window.EmberBridge;
    vi.clearAllTimers();
    vi.useRealTimers();
});

describe('useEmberDataSync', () => {
    queryTest('invalidates queries for mapped Ember models', async ({ queryClient, wrapper }) => {
        const mock = createMockStateBridge();
        window.EmberBridge = { state: mock.stateBridge };

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
        window.EmberBridge = { state: mock.stateBridge };
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
        expect(vi.getTimerCount()).toBe(1);
        unmount();

        window.EmberBridge = { state: mock.stateBridge };

        await act(async () => {
            await vi.advanceTimersByTimeAsync(200);
        });

        expect(mock.onSpy).not.toHaveBeenCalled();
        expect(vi.getTimerCount()).toBe(0);
    });

    queryTest('stops polling once EmberBridge becomes available', async ({ wrapper }) => {
        vi.useFakeTimers();
        const mock = createMockStateBridge();

        renderHook(() => useEmberDataSync(), { wrapper });
        expect(vi.getTimerCount()).toBe(1);

        window.EmberBridge = { state: mock.stateBridge };

        await act(async () => {
            await vi.advanceTimersByTimeAsync(200);
        });

        expect(mock.onSpy).toHaveBeenCalledWith('emberDataChange', expect.any(Function));

        expect(vi.getTimerCount()).toBe(0);
    });
});

describe('useEmberAuthSync', () => {
    queryTest('invalidates all queries when auth changes', async ({ queryClient, wrapper }) => {
        const mock = createMockStateBridge();
        window.EmberBridge = { state: mock.stateBridge };

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
        window.EmberBridge = { state: mock.stateBridge };

        const { result } = renderHook(() => useSidebarVisibility());

        expect(result.current).toBe(false);
    });

    baseTest('updates when Ember emits sidebarVisibilityChange event', async () => {
        const mock = createMockStateBridge(true);
        window.EmberBridge = { state: mock.stateBridge };

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
        window.EmberBridge = { state: mock.stateBridge };

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
        window.EmberBridge = { state: mock.stateBridge };

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

        window.EmberBridge = { state: mock.stateBridge };

        await vi.advanceTimersByTimeAsync(200);

        expect(mock.onSpy).not.toHaveBeenCalled();
    });
});

describe('useEmberRouting', () => {
    baseTest('returns default no-op routing when EmberBridge is not available', () => {
        const { result } = renderHook(() => useEmberRouting());

        // Should return default routing with no-op functions
        expect(result.current).toHaveProperty('getRouteUrl');
        expect(result.current).toHaveProperty('isRouteActive');

        // Default getRouteUrl just returns the route name
        expect(result.current.getRouteUrl('posts')).toBe('posts');

        // Default isRouteActive always returns false
        expect(result.current.isRouteActive('posts')).toBe(false);
    });

    baseTest('returns bridge routing methods when bridge is available', () => {
        const mock = createMockStateBridge();
        window.EmberBridge = { state: mock.stateBridge };

        const { result } = renderHook(() => useEmberRouting());

        expect(result.current).toHaveProperty('getRouteUrl');
        expect(result.current).toHaveProperty('isRouteActive');

        // Should be using bridge methods, not defaults
        expect(result.current.getRouteUrl).toBe(mock.stateBridge.getRouteUrl);
        expect(result.current.isRouteActive).toBe(mock.stateBridge.isRouteActive);
    });

    baseTest('switches to bridge methods when bridge becomes available', async () => {
        vi.useFakeTimers();

        const { result } = renderHook(() => useEmberRouting());

        // Initially using default routing
        expect(result.current.getRouteUrl('posts')).toBe('posts');
        expect(result.current.isRouteActive('posts')).toBe(false);

        // Bridge becomes available
        const mock = createMockStateBridge();
        window.EmberBridge = { state: mock.stateBridge };

        // Wait for the subscription interval to fire
        await act(async () => {
            await vi.advanceTimersByTimeAsync(150);
        });

        // Now should be using bridge methods
        expect(result.current.getRouteUrl).toBe(mock.stateBridge.getRouteUrl);
        expect(result.current.isRouteActive).toBe(mock.stateBridge.isRouteActive);
    });

    baseTest('re-renders when route changes', async () => {
        const mock = createMockStateBridge();
        window.EmberBridge = { state: mock.stateBridge };

        let renderCount = 0;
        const { result } = renderHook(() => {
            renderCount++;
            return useEmberRouting();
        });

        // Initial render
        expect(renderCount).toBe(1);
        expect(result.current.getRouteUrl).toBe(mock.stateBridge.getRouteUrl);

        await waitFor(() => {
            expect(mock.onSpy).toHaveBeenCalledWith('routeChange', expect.any(Function));
        });

        // Trigger route change
        act(() => {
            mock.emit('routeChange', {
                routeName: 'posts',
                queryParams: {}
            });
        });

        // Should have re-rendered
        await waitFor(() => {
            expect(renderCount).toBe(2);
        });
    });
});

