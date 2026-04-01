// @vitest-environment jsdom

import {MemoryRouter, useSearchParams} from 'react-router';
import {act, renderHook} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {shouldDelayCommentDateFilterHydration, useFilterState} from '@views/comments/hooks/use-filter-state';
import type {ReactNode} from 'react';

function createWrapper(initialEntry: string) {
    return function Wrapper({children}: {children: ReactNode}) {
        return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
    };
}

describe('use-filter-state', () => {
    describe('shouldDelayCommentDateFilterHydration', () => {
        it('waits for timezone resolution when date filters are present', () => {
            expect(shouldDelayCommentDateFilterHydration('created_at:<=\'2024-02-01T22:59:59.999Z\'', false, true)).toBe(true);
        });

        it('does not wait for non-date filters', () => {
            expect(shouldDelayCommentDateFilterHydration('status:published+count.reports:>0', false, true)).toBe(false);
        });
    });

    describe('useFilterState', () => {
        it('reads canonical filter params', () => {
            const {result} = renderHook(() => useFilterState('UTC'), {
                wrapper: createWrapper('/?filter=status:published')
            });

            expect(result.current.filters).toEqual([
                {
                    id: 'status:1',
                    field: 'status',
                    operator: 'is',
                    values: ['published']
                }
            ]);
            expect(result.current.nql).toBe('status:published');
        });

        it('ignores legacy id params because single-comment mode is handled outside filter state', () => {
            const {result} = renderHook(() => useFilterState('UTC'), {
                wrapper: createWrapper('/?id=is:comment_123')
            });

            expect(result.current.filters).toEqual([]);
            expect(result.current.nql).toBeUndefined();
        });

        it('writes canonical filter params while preserving unrelated query params', () => {
            const {result} = renderHook(() => {
                const state = useFilterState('UTC');
                const [searchParams] = useSearchParams();

                return {
                    ...state,
                    query: searchParams.toString()
                };
            }, {wrapper: createWrapper('/?thread=is:comment_123')});

            act(() => {
                result.current.setFilters([
                    {
                        id: '1',
                        field: 'reported',
                        operator: 'is',
                        values: ['true']
                    }
                ], {replace: false});
            });

            expect(result.current.query).toBe('thread=is%3Acomment_123&filter=count.reports%3A%3E0');
        });

        it('removes only the canonical filter param when clearing filters', () => {
            const {result} = renderHook(() => {
                const state = useFilterState('UTC');
                const [searchParams] = useSearchParams();

                return {
                    ...state,
                    query: searchParams.toString()
                };
            }, {wrapper: createWrapper('/?filter=status:published&id=is:comment_123&thread=is:comment_456')});

            act(() => {
                result.current.clearFilters({replace: false});
            });

            expect(result.current.query).toBe('id=is%3Acomment_123&thread=is%3Acomment_456');
            expect(result.current.filters).toEqual([]);
            expect(result.current.nql).toBeUndefined();
        });
    });
});
