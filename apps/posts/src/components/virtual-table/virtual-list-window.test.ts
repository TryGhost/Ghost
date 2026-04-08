import React from 'react';
import {MemoryRouter, useSearchParams} from 'react-router';
import {act, renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it} from 'vitest';
import type {ReactNode} from 'react';

import {useVirtualListWindow} from './virtual-list-window';

function createWrapper(initialEntry: string) {
    return function Wrapper({children}: {children: ReactNode}) {
        return React.createElement(
            MemoryRouter,
            {initialEntries: [initialEntry]},
            children
        );
    };
}

describe('virtual-list-window', () => {
    beforeEach(() => {
        window.history.replaceState({}, '');
    });

    it('restores the unlocked window from the current history entry on remount', () => {
        window.history.replaceState({
            ghostVirtualListWindow: {
                '/members::?filter=members': 2000
            }
        }, '');

        const wrapper = createWrapper('/members?filter=members');
        const {result, unmount} = renderHook(() => useVirtualListWindow(5000), {wrapper});

        expect(result.current.visibleItemCount).toBe(2000);

        unmount();

        const remounted = renderHook(() => useVirtualListWindow(5000), {wrapper});

        expect(remounted.result.current.visibleItemCount).toBe(2000);
    });

    it('writes the unlocked window to the current history entry when load more is used', () => {
        window.history.replaceState({}, '');

        const {result} = renderHook(() => useVirtualListWindow(5000), {
            wrapper: createWrapper('/members?filter=members')
        });

        act(() => {
            result.current.loadMore();
        });

        expect(window.history.state).toMatchObject({
            ghostVirtualListWindow: {
                '/members::?filter=members': 2000
            }
        });
    });

    it('caps the visible window at 1,000 rows by default', () => {
        const {result} = renderHook(() => useVirtualListWindow(1500), {
            wrapper: createWrapper('/members?filter=members')
        });

        expect(result.current).toMatchObject({
            canLoadMore: true,
            visibleItemCount: 1000
        });
    });

    it('shows all items when the total is below the cap', () => {
        const {result} = renderHook(() => useVirtualListWindow(125), {
            wrapper: createWrapper('/members?filter=members')
        });

        expect(result.current).toMatchObject({
            canLoadMore: false,
            visibleItemCount: 125
        });
    });

    it('unlocks the next 1,000 rows each time load more is requested', () => {
        const {result} = renderHook(() => useVirtualListWindow(5000), {
            wrapper: createWrapper('/members?filter=members')
        });

        expect(result.current.visibleItemCount).toBe(1000);

        act(() => {
            result.current.loadMore();
        });

        expect(result.current.visibleItemCount).toBe(2000);
    });

    it('ignores invalid persisted unlocked counts', () => {
        window.history.replaceState({
            ghostVirtualListWindow: {
                '/members::?filter=members': Number.NaN
            }
        }, '');

        const {result} = renderHook(() => useVirtualListWindow(5000), {
            wrapper: createWrapper('/members?filter=members')
        });

        expect(result.current.visibleItemCount).toBe(1000);
    });

    it('resets the unlocked window when the query changes by default', () => {
        const {result} = renderHook(() => {
            const state = useVirtualListWindow(5000);
            const [, setSearchParams] = useSearchParams();

            return {
                ...state,
                setQuery: (query: string) => setSearchParams(query)
            };
        }, {
            wrapper: createWrapper('/?filter=members')
        });

        act(() => {
            result.current.loadMore();
        });

        expect(result.current.visibleItemCount).toBe(2000);

        act(() => {
            result.current.setQuery('filter=paid');
        });

        expect(result.current.visibleItemCount).toBe(1000);
    });

    it('only resets the unlocked window when the explicit reset key changes', () => {
        const {result, rerender} = renderHook(
            ({resetKey}) => {
                const state = useVirtualListWindow(5000, {resetKey});
                const [, setSearchParams] = useSearchParams();

                return {
                    ...state,
                    setQuery: (query: string) => setSearchParams(query)
                };
            },
            {
                initialProps: {
                    resetKey: 'members:initial'
                },
                wrapper: createWrapper('/?filter=members')
            }
        );

        act(() => {
            result.current.loadMore();
        });

        expect(result.current.visibleItemCount).toBe(2000);

        rerender({resetKey: 'members:initial'});

        expect(result.current.visibleItemCount).toBe(2000);

        act(() => {
            result.current.setQuery('filter=paid');
        });

        expect(result.current.visibleItemCount).toBe(2000);

        rerender({resetKey: 'members:changed'});

        expect(result.current.visibleItemCount).toBe(1000);
    });

    it('persists the unlocked window into new history entries even when the reset key stays the same', () => {
        const {result} = renderHook(() => {
            const state = useVirtualListWindow(5000, {resetKey: 'comments:nql'});
            const [, setSearchParams] = useSearchParams();

            return {
                ...state,
                setQuery: (query: string) => setSearchParams(query)
            };
        }, {
            wrapper: createWrapper('/?thread=initial')
        });

        act(() => {
            result.current.loadMore();
        });

        expect(result.current.visibleItemCount).toBe(2000);

        act(() => {
            window.history.replaceState({}, '');
            result.current.setQuery('thread=updated');
        });

        expect(window.history.state).toMatchObject({
            ghostVirtualListWindow: {
                '/::comments:nql': 2000
            }
        });
    });
});
