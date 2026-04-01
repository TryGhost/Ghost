// @vitest-environment jsdom

import React from 'react';
import {MemoryRouter, useLocation} from 'react-router';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';

const useBrowseCommentsMock = vi.fn();
const useBrowseSettingsMock = vi.fn();
const getSiteTimezoneMock = vi.fn((settings: Array<{key: string; value: unknown}>) => {
    const timezone = settings.find(setting => setting.key === 'timezone')?.value;

    return typeof timezone === 'string' ? timezone : 'UTC';
});

vi.mock('@tryghost/admin-x-framework/api/comments', () => ({
    useBrowseComments: (...args: unknown[]) => useBrowseCommentsMock(...args)
}));

vi.mock('@tryghost/admin-x-framework/api/settings', () => ({
    useBrowseSettings: (...args: unknown[]) => useBrowseSettingsMock(...args)
}));

vi.mock('@src/utils/get-site-timezone', () => ({
    getSiteTimezone: (...args: Array<Array<{key: string; value: unknown}>>) => getSiteTimezoneMock(...args)
}));

vi.mock('@views/comments/components/comments-layout', () => ({
    default: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}));

vi.mock('@views/comments/components/comments-header', () => ({
    default: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}));

vi.mock('@views/comments/components/comments-content', () => ({
    default: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}));

vi.mock('@views/comments/components/comments-list', () => ({
    default: () => <div data-testid="comments-list" />
}));

vi.mock('@views/comments/components/comments-filters', () => ({
    default: ({onFiltersChange}: {onFiltersChange: (filters: Array<{id: string; field: string; operator: string; values: string[]}>) => void}) => (
        <button
            data-testid="apply-filter"
            type="button"
            onClick={() => onFiltersChange([{
                id: 'status:1',
                field: 'status',
                operator: 'is',
                values: ['published']
            }])}
        >
            Apply filter
        </button>
    )
}));

function LocationProbe() {
    const location = useLocation();

    return <div data-testid="location-search">{location.search}</div>;
}

async function renderComments(initialEntry: string) {
    const {default: Comments} = await import('@views/comments/comments');

    return {
        Comments,
        ...render(
            <MemoryRouter initialEntries={[initialEntry]}>
                <LocationProbe />
                <Comments />
            </MemoryRouter>
        )
    };
}

describe('Comments', () => {
    beforeEach(() => {
        getSiteTimezoneMock.mockClear();
        useBrowseCommentsMock.mockReset();
        useBrowseSettingsMock.mockReset();
        useBrowseCommentsMock.mockReturnValue({
            data: {
                comments: [{id: 'comment_123'}],
                meta: {pagination: {total: 1}}
            },
            isError: false,
            isFetching: false,
            isFetchingNextPage: false,
            isRefetching: false,
            fetchNextPage: vi.fn(),
            hasNextPage: false
        });
        useBrowseSettingsMock.mockReturnValue({
            data: {settings: [{key: 'timezone', value: 'UTC'}]},
            isLoading: false
        });
    });

    it('treats id deep links as a dedicated single-comment mode that overrides filter state', async () => {
        await renderComments('/?id=is:comment_123&filter=status:published');

        expect(useBrowseCommentsMock).toHaveBeenCalledWith(expect.objectContaining({
            keepPreviousData: true,
            searchParams: {filter: 'id:\'comment_123\''}
        }));
        expect(screen.queryByTestId('apply-filter')).not.toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Show all comments'})).toBeInTheDocument();
    });

    it('clears the full query string when leaving single-comment mode', async () => {
        await renderComments('/?id=is:comment_123&thread=is:comment_456&filter=status:published');

        fireEvent.click(screen.getByRole('button', {name: 'Show all comments'}));

        expect(screen.getByTestId('location-search')).toHaveTextContent('');
    });

    it('keeps thread state separate from canonical filter state updates', async () => {
        await renderComments('/?thread=is:comment_456');

        fireEvent.click(screen.getByTestId('apply-filter'));

        expect(screen.getByTestId('location-search')).toHaveTextContent('?thread=is%3Acomment_456&filter=status%3Apublished');
    });

    it('delays date-filter hydration until the site timezone is resolved', async () => {
        const encodedFilter = encodeURIComponent(
            'created_at:>=\'2024-03-10T05:00:00.000Z\'+created_at:<=\'2024-03-11T03:59:59.999Z\''
        );

        useBrowseSettingsMock.mockReturnValue({
            data: undefined,
            isLoading: true
        });

        const {Comments, rerender} = await renderComments(`/?filter=${encodedFilter}`);

        expect(useBrowseCommentsMock).not.toHaveBeenCalled();

        useBrowseSettingsMock.mockReturnValue({
            data: {settings: [{key: 'timezone', value: 'America/New_York'}]},
            isLoading: false
        });

        rerender(
            <MemoryRouter initialEntries={[`/?filter=${encodedFilter}`]}>
                <LocationProbe />
                <Comments />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(getSiteTimezoneMock).toHaveBeenCalledWith([{key: 'timezone', value: 'America/New_York'}]);
            expect(useBrowseCommentsMock).toHaveBeenCalledWith(expect.objectContaining({
                keepPreviousData: true,
                searchParams: {
                    filter: 'created_at:<=\'2024-03-11T03:59:59.999Z\'+created_at:>=\'2024-03-10T05:00:00.000Z\''
                }
            }));
        });
    });
});
