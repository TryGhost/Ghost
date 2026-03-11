import {describe, expect, it, vi} from 'vitest';
import {render, screen, fireEvent} from '@testing-library/react';
import Members from './members';

const mockUseMembersFilterState = vi.fn();
const mockUseBrowseConfig = vi.fn();
const mockUseBrowseMembersInfinite = vi.fn();

vi.mock('./hooks/use-members-filter-state', () => ({
    useMembersFilterState: () => mockUseMembersFilterState()
}));

vi.mock('@tryghost/admin-x-framework/api/config', () => ({
    useBrowseConfig: () => mockUseBrowseConfig()
}));

vi.mock('@tryghost/admin-x-framework/api/members', () => ({
    useBrowseMembersInfinite: () => mockUseBrowseMembersInfinite()
}));

vi.mock('./components/members-header', () => ({
    default: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}));

vi.mock('./components/members-layout', () => ({
    default: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}));

vi.mock('./components/members-content', () => ({
    default: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}));

vi.mock('./components/members-filters', () => ({
    default: () => <div>Members filters</div>
}));

vi.mock('./components/members-actions', () => ({
    default: () => <div>Members actions</div>
}));

vi.mock('./components/members-list', () => ({
    default: () => <div>Members list</div>
}));

const buildMembersBrowseResult = (total = 0) => ({
    data: {
        members: [],
        meta: {
            pagination: {
                total
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

const renderMembersPage = (filterState: Record<string, unknown>) => {
    mockUseMembersFilterState.mockReturnValue(filterState);
    mockUseBrowseConfig.mockReturnValue({
        data: {
            config: {
                emailAnalytics: false
            }
        }
    });
    mockUseBrowseMembersInfinite.mockReturnValue(buildMembersBrowseResult());

    render(<Members />);
};

describe('Members', () => {
    it('shows the filtered empty state and clear action when search is active without picker filters', () => {
        const resetFiltersAndSearch = vi.fn();

        renderMembersPage({
            filters: [],
            nql: undefined,
            search: 'alex',
            setFilters: vi.fn(),
            hasFilters: false,
            hasFilterOrSearch: true,
            clearFilters: vi.fn(),
            resetFiltersAndSearch,
            activeColumns: []
        });

        expect(screen.getByText('No members match the current filter')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Show all members'}));
        expect(resetFiltersAndSearch).toHaveBeenCalledWith({replace: false});
        expect(screen.getByText('Members filters')).toBeInTheDocument();
    });

    it('shows the plain empty state without a clear action when no filters or search are active', () => {
        renderMembersPage({
            filters: [],
            nql: undefined,
            search: '',
            setFilters: vi.fn(),
            hasFilters: false,
            hasFilterOrSearch: false,
            clearFilters: vi.fn(),
            resetFiltersAndSearch: vi.fn(),
            activeColumns: []
        });

        expect(screen.getByText('No members yet')).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Show all members'})).not.toBeInTheDocument();
    });
});
