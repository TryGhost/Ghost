import {ANALYTICS_FILTER_FIELDS, POST_ANALYTICS_FILTER_FIELDS, useFilterParams} from '@/shared/analytics/use-filter-params';
import {MemoryRouter, useSearchParams} from 'react-router';
import {act, renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {ReactNode} from 'react';

vi.mock('@tryghost/admin-x-framework', async (importOriginal) => {
    const original = await importOriginal<typeof import('@tryghost/admin-x-framework')>();
    return {
        ...original,
        trackFilterApplications: vi.fn()
    };
});

const mockTrackFilterApplications = vi.mocked(await import('@tryghost/admin-x-framework')).trackFilterApplications;

function createWrapper(initialEntry: string) {
    return function Wrapper({children}: {children: ReactNode}) {
        return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
    };
}

// Renders the hook alongside a probe of the current URL search params
function renderFilterParams(options: Parameters<typeof useFilterParams>[0], initialEntry = '/') {
    return renderHook(() => {
        const state = useFilterParams(options);
        const [searchParams] = useSearchParams();

        return {
            ...state,
            query: searchParams.toString()
        };
    }, {wrapper: createWrapper(initialEntry)});
}

const siteOptions = {supportedFields: ANALYTICS_FILTER_FIELDS, trackingSource: 'stats'};
const postOptions = {supportedFields: POST_ANALYTICS_FILTER_FIELDS, trackingSource: 'post-analytics'};

describe('useFilterParams', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('parses supported fields from the URL in order', () => {
        const {result} = renderFilterParams(siteOptions, '/?source=google.com&location=US');

        expect(result.current.filters).toEqual([
            expect.objectContaining({field: 'source', operator: 'is', values: ['google.com']}),
            expect.objectContaining({field: 'location', operator: 'is', values: ['US']})
        ]);
    });

    it('ignores params outside the supported fields', () => {
        const {result} = renderFilterParams(siteOptions, '/?source=google.com&tab=visits&bogus=1');

        expect(result.current.filters).toEqual([
            expect.objectContaining({field: 'source', values: ['google.com']})
        ]);
    });

    it('uses the "is any of" operator for the audience field and splits its values', () => {
        const {result} = renderFilterParams(siteOptions, '/?audience=free,paid');

        expect(result.current.filters).toEqual([
            expect.objectContaining({field: 'audience', operator: 'is any of', values: ['free', 'paid']})
        ]);
    });

    it('round-trips empty string values via the empty marker (Direct traffic)', () => {
        const {result} = renderFilterParams(siteOptions);

        act(() => {
            result.current.setFilters([{id: '1', field: 'source', operator: 'is', values: ['']}]);
        });
        expect(result.current.query).toBe('source=__empty__');
        expect(result.current.filters).toEqual([
            expect.objectContaining({field: 'source', values: ['']})
        ]);
    });

    it('round-trips values containing commas', () => {
        const {result} = renderFilterParams(siteOptions);

        act(() => {
            result.current.setFilters([{id: '1', field: 'utm_campaign', operator: 'is', values: ['summer,sale,2024']}]);
        });
        expect(result.current.filters).toEqual([
            expect.objectContaining({field: 'utm_campaign', values: ['summer,sale,2024']})
        ]);
    });

    it('preserves non-filter params when setting and clearing filters', () => {
        const {result} = renderFilterParams(siteOptions, '/?tab=visits&source=google.com');

        act(() => {
            result.current.setFilters([{id: '1', field: 'device', operator: 'is', values: ['desktop']}]);
        });
        expect(result.current.query).toBe('tab=visits&device=desktop');

        act(() => {
            result.current.clearFilters();
        });
        expect(result.current.query).toBe('tab=visits');
    });

    it('supports functional updates', () => {
        const {result} = renderFilterParams(siteOptions, '/?source=google.com');

        act(() => {
            result.current.setFilters(prev => [...prev, {id: '2', field: 'device', operator: 'is', values: ['desktop']}]);
        });
        expect(result.current.filters).toEqual([
            expect.objectContaining({field: 'source', values: ['google.com']}),
            expect.objectContaining({field: 'device', values: ['desktop']})
        ]);
    });

    it('reports filter applications with the configured tracking source', () => {
        const {result} = renderFilterParams(postOptions);

        act(() => {
            result.current.setFilters([{id: '1', field: 'device', operator: 'is', values: ['desktop']}]);
        });
        expect(mockTrackFilterApplications).toHaveBeenCalledWith(
            [],
            [expect.objectContaining({field: 'device'})],
            'post-analytics'
        );
    });

    describe('site-wide analytics parameterization', () => {
        it('supports the post field', () => {
            const {result} = renderFilterParams(siteOptions, '/?post=some-post-uuid');

            expect(result.current.filters).toEqual([
                expect.objectContaining({field: 'post', values: ['some-post-uuid']})
            ]);
        });
    });

    describe('post analytics parameterization', () => {
        it('does not support the post field — the surface is already scoped to one post', () => {
            const {result} = renderFilterParams(postOptions, '/?post=some-post-uuid&device=desktop');

            expect(result.current.filters).toEqual([
                expect.objectContaining({field: 'device', values: ['desktop']})
            ]);
        });

        it('supports the rest of the shared fields', () => {
            const {result} = renderFilterParams(postOptions, '/?audience=free&gift_link=true&utm_source=newsletter');

            expect(result.current.filters).toEqual([
                expect.objectContaining({field: 'audience', operator: 'is any of', values: ['free']}),
                expect.objectContaining({field: 'gift_link', values: ['true']}),
                expect.objectContaining({field: 'utm_source', values: ['newsletter']})
            ]);
        });
    });
});
