import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

const useMembersFilterStateSpy = vi.fn();
const useBrowseMembersInfiniteSpy = vi.fn();

vi.mock('./hooks/use-members-filter-state', () => ({
    useMembersFilterState: () => useMembersFilterStateSpy()
}));

vi.mock('@tryghost/admin-x-framework/api/members', () => ({
    useBrowseMembersInfinite: (...args: unknown[]) => useBrowseMembersInfiniteSpy(...args)
}));

vi.mock('@tryghost/admin-x-framework/api/config', () => ({
    useBrowseConfig: () => ({data: {config: {emailAnalytics: false}}})
}));

vi.mock('./components/members-layout', () => ({
    default: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}));

vi.mock('./components/members-header', () => ({
    default: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}));

vi.mock('./components/members-content', () => ({
    default: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}));

vi.mock('./components/members-list', () => ({
    default: () => <div>members-list</div>
}));

vi.mock('@components/virtual-table/use-infinite-virtual-scroll', () => ({
    useInfiniteVirtualScroll: () => ({
        visibleItems: [],
        spaceBefore: 0,
        spaceAfter: 0
    })
}));

vi.mock('@components/virtual-table/use-scroll-restoration', () => ({
    useScrollRestoration: () => undefined
}));

vi.mock('./components/members-filters', () => ({
    default: () => <div>members-filters</div>
}));

vi.mock('./components/members-actions', () => ({
    default: () => <div>members-actions</div>
}));

vi.mock('@tryghost/shade', async () => {
    const actual = await vi.importActual<object>('@tryghost/shade');

    return {
        ...actual,
        Button: ({children, onClick}: {children: React.ReactNode; onClick?: () => void}) => (
            <button onClick={onClick}>{children}</button>
        ),
        EmptyIndicator: ({title}: {title: string}) => <div>{title}</div>,
        Header: {
            Actions: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
            ActionGroup: ({children}: {children: React.ReactNode}) => <div>{children}</div>
        },
        LoadingIndicator: () => <div>loading</div>,
        LucideIcon: {
            Users: () => null
        },
        cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ')
    };
});

describe('Members', () => {
    it('shows the filtered empty state and clears everything from the CTA', async () => {
        const {default: Members} = await import('./members');
        const clearAll = vi.fn();

        useMembersFilterStateSpy.mockReturnValue({
            filters: [{id: '1', field: 'status', operator: 'is', values: ['paid']}],
            nql: 'status:paid',
            search: 'jamie',
            setFilters: vi.fn(),
            hasFilterOrSearch: true,
            clearAll
        });
        useBrowseMembersInfiniteSpy.mockReturnValue({
            data: {members: [], meta: {pagination: {total: 0}}},
            isError: false,
            isFetching: false,
            isFetchingNextPage: false,
            isRefetching: false,
            fetchNextPage: vi.fn(),
            hasNextPage: false
        });

        render(<Members />);

        expect(screen.getByText('No members match the current filter')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Show all members'));

        expect(clearAll).toHaveBeenCalledWith({replace: false});
    });

    it('shows the default empty state when no filters or search are active', async () => {
        const {default: Members} = await import('./members');
        useMembersFilterStateSpy.mockReturnValue({
            filters: [],
            nql: undefined,
            search: '',
            setFilters: vi.fn(),
            hasFilterOrSearch: false,
            clearAll: vi.fn()
        });
        useBrowseMembersInfiniteSpy.mockReturnValue({
            data: {members: [], meta: {pagination: {total: 0}}},
            isError: false,
            isFetching: false,
            isFetchingNextPage: false,
            isRefetching: false,
            fetchNextPage: vi.fn(),
            hasNextPage: false
        });

        render(<Members />);

        expect(screen.getByText('No members yet')).toBeInTheDocument();
        expect(screen.queryByText('Show all members')).not.toBeInTheDocument();
    });
});
