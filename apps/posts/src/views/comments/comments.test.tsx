import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

const useFilterStateSpy = vi.fn();
const useBrowseCommentsSpy = vi.fn();

vi.mock('./hooks/use-filter-state', () => ({
    useFilterState: () => useFilterStateSpy()
}));

vi.mock('@tryghost/admin-x-framework/api/comments', () => ({
    useBrowseComments: (...args: unknown[]) => useBrowseCommentsSpy(...args)
}));

vi.mock('./hooks/use-known-filter-values', () => ({
    useKnownFilterValues: () => ({
        knownPosts: [],
        knownMembers: []
    })
}));

vi.mock('./components/comments-layout', () => ({
    default: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}));

vi.mock('@components/layout/main-layout', () => ({
    default: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}));

vi.mock('./components/comments-header', () => ({
    default: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}));

vi.mock('./components/comments-content', () => ({
    default: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}));

vi.mock('./components/comments-list', () => ({
    default: () => <div>comments-list</div>
}));

vi.mock('./components/comments-filters', () => ({
    default: () => <div>comments-filters</div>
}));

vi.mock('@tryghost/shade', async () => {
    const actual = await vi.importActual<object>('@tryghost/shade');

    return {
        ...actual,
        Button: ({children, onClick}: {children: React.ReactNode; onClick?: () => void}) => (
            <button onClick={onClick}>{children}</button>
        ),
        EmptyIndicator: ({title}: {title: string}) => <div>{title}</div>,
        LoadingIndicator: () => <div>loading</div>,
        LucideIcon: {
            MessageSquare: () => null
        },
        createFilter: vi.fn((field: string, operator: string, values: string[]) => ({
            id: `${field}:1`,
            field,
            operator,
            values
        }))
    };
});

describe('Comments', () => {
    it('shows the filtered empty state and clears filters from the CTA', async () => {
        const {default: Comments} = await import('./comments');
        const clearFilters = vi.fn();

        useFilterStateSpy.mockReturnValue({
            filters: [{id: '1', field: 'reported', operator: 'is', values: ['true']}],
            nql: 'count.reports:>0',
            setFilters: vi.fn(),
            clearFilters,
            isSingleIdFilter: false
        });
        useBrowseCommentsSpy.mockReturnValue({
            data: {comments: [], meta: {pagination: {total: 0}}},
            isError: false,
            isFetching: false,
            isFetchingNextPage: false,
            isRefetching: false,
            fetchNextPage: vi.fn(),
            hasNextPage: false
        });

        render(<Comments />);

        expect(screen.getByText('No comments match the current filter')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Show all comments'));

        expect(clearFilters).toHaveBeenCalledWith({replace: false});
    });

    it('shows the default empty state when no filters are active', async () => {
        const {default: Comments} = await import('./comments');
        useFilterStateSpy.mockReturnValue({
            filters: [],
            nql: undefined,
            setFilters: vi.fn(),
            clearFilters: vi.fn(),
            isSingleIdFilter: false
        });
        useBrowseCommentsSpy.mockReturnValue({
            data: {comments: [], meta: {pagination: {total: 0}}},
            isError: false,
            isFetching: false,
            isFetchingNextPage: false,
            isRefetching: false,
            fetchNextPage: vi.fn(),
            hasNextPage: false
        });

        render(<Comments />);

        expect(screen.getByText('No comments yet')).toBeInTheDocument();
        expect(screen.queryByText('Show all comments')).not.toBeInTheDocument();
    });
});
