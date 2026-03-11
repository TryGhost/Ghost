import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import Comments from './comments';

const mockUseFilterState = vi.fn();
const mockUseBrowseComments = vi.fn();
const mockUseKnownFilterValues = vi.fn();

vi.mock('./hooks/use-filter-state', () => ({
    useFilterState: () => mockUseFilterState()
}));

vi.mock('@tryghost/admin-x-framework/api/comments', () => ({
    useBrowseComments: () => mockUseBrowseComments()
}));

vi.mock('./hooks/use-known-filter-values', () => ({
    useKnownFilterValues: () => mockUseKnownFilterValues()
}));

vi.mock('./components/comments-header', () => ({
    default: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}));

vi.mock('./components/comments-layout', () => ({
    default: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}));

vi.mock('./components/comments-content', () => ({
    default: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}));

vi.mock('./components/comments-filters', () => ({
    default: () => <div>Comments filters</div>
}));

vi.mock('./components/comments-list', () => ({
    default: () => <div>Comments list</div>
}));

const buildCommentsBrowseResult = (comments: Array<{id: string}>) => ({
    data: {
        comments,
        meta: {
            pagination: {
                total: comments.length
            }
        }
    },
    isError: false,
    isFetching: false,
    isFetchingNextPage: false,
    isRefetching: false,
    fetchNextPage: vi.fn(),
    hasNextPage: false
});

const renderCommentsPage = (filterState: Record<string, unknown>, comments: Array<{id: string}> = []) => {
    mockUseFilterState.mockReturnValue(filterState);
    mockUseBrowseComments.mockReturnValue(buildCommentsBrowseResult(comments));
    mockUseKnownFilterValues.mockReturnValue({
        knownPosts: [],
        knownMembers: []
    });

    render(<Comments />);
};

describe('Comments', () => {
    it('hides the filter picker and shows the clear action for a single id filter', () => {
        const clearFilters = vi.fn();

        renderCommentsPage({
            filters: [{id: 'id-1', field: 'id', operator: 'is', values: ['comment_1']}],
            nql: 'id:\'comment_1\'',
            setFilters: vi.fn(),
            clearFilters,
            hasFilters: true,
            isSingleIdFilter: true
        }, [{id: 'comment_1'}]);

        expect(screen.queryByText('Comments filters')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Show all comments'}));
        expect(clearFilters).toHaveBeenCalledWith({replace: false});
        expect(screen.getByText('Comments list')).toBeInTheDocument();
    });

    it('shows the filtered empty state and clear action for non-id filters', () => {
        const clearFilters = vi.fn();

        renderCommentsPage({
            filters: [{id: 'status-1', field: 'status', operator: 'is', values: ['published']}],
            nql: 'status:published',
            setFilters: vi.fn(),
            clearFilters,
            hasFilters: true,
            isSingleIdFilter: false
        });

        expect(screen.getByText('Comments filters')).toBeInTheDocument();
        expect(screen.getByText('No comments match the current filter')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Show all comments'}));
        expect(clearFilters).toHaveBeenCalledWith({replace: false});
    });
});
