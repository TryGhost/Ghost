import {render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import MembersFilters from './members-filters';

const filtersSpy = vi.fn();
const useMemberFilterFieldsSpy = vi.fn();

vi.mock('../hooks/use-resource-search', () => ({
    useResourceSearch: vi.fn(() => ({
        options: [],
        onSearchChange: vi.fn(),
        searchValue: '',
        isLoading: false
    }))
}));

vi.mock('../use-member-filter-fields', async () => {
    const actual = await vi.importActual<object>('../use-member-filter-fields');

    return {
        ...actual,
        useMemberFilterFields: (...args: unknown[]) => useMemberFilterFieldsSpy(...args)
    };
});

vi.mock('@tryghost/admin-x-framework/api/labels', () => ({
    useBrowseLabels: () => ({data: {labels: []}})
}));

vi.mock('@tryghost/admin-x-framework/api/tiers', () => ({
    useBrowseTiers: () => ({data: {tiers: []}})
}));

vi.mock('@tryghost/admin-x-framework/api/newsletters', () => ({
    useBrowseNewsletters: () => ({data: {newsletters: []}})
}));

vi.mock('@tryghost/admin-x-framework/api/offers', () => ({
    useBrowseOffers: () => ({
        data: {
            offers: [
                {id: 'offer_regular', name: 'Regular Offer', redemption_type: 'signup', cadence: 'month'},
                {id: 'offer_month_1', name: 'Monthly Retention A', redemption_type: 'retention', cadence: 'month'},
                {id: 'offer_month_2', name: 'Monthly Retention B', redemption_type: 'retention', cadence: 'month'}
            ]
        }
    })
}));

vi.mock('@tryghost/admin-x-framework/api/settings', () => ({
    useBrowseSettings: () => ({data: {settings: []}}),
    getSettingValue: vi.fn(() => undefined)
}));

vi.mock('@tryghost/admin-x-framework/api/config', () => ({
    useBrowseConfig: () => ({
        data: {
            config: {
                emailAnalytics: false,
                labs: {
                    audienceFeedback: false,
                    retentionOffers: true
                }
            }
        }
    })
}));

vi.mock('@src/utils/get-site-timezone', () => ({
    getSiteTimezone: () => 'UTC'
}));

vi.mock('@tryghost/shade', async () => {
    const actual = await vi.importActual<object>('@tryghost/shade');

    return {
        ...actual,
        Filters: (props: object) => {
            filtersSpy(props);

            const {addButtonText, showClearButton}: {addButtonText: string; showClearButton: boolean} = props as never;

            return (
                <div>
                    <span>{addButtonText}</span>
                    <span>{showClearButton ? 'clear-on' : 'clear-off'}</span>
                </div>
            );
        }
    };
});

describe('MembersFilters', () => {
    beforeEach(() => {
        filtersSpy.mockClear();
        useMemberFilterFieldsSpy.mockReset();
        useMemberFilterFieldsSpy.mockReturnValue([{group: 'Basic', fields: [{key: 'status'}]}]);
    });

    it('uses the compact filter button state when there are no filters', () => {
        render(<MembersFilters filters={[]} onFiltersChange={vi.fn()} />);

        expect(screen.getByText('Filter')).toBeInTheDocument();
        expect(screen.getByText('clear-off')).toBeInTheDocument();
        expect(filtersSpy).toHaveBeenCalledWith(expect.objectContaining({
            allowMultiple: true,
            popoverAlign: 'end',
            showClearButton: false,
            filters: []
        }));
    });

    it('uses the expanded filter button state when filters are active', () => {
        render(
            <MembersFilters
                filters={[{id: '1', field: 'status', operator: 'is', values: ['paid']}]}
                onFiltersChange={vi.fn()}
            />
        );

        expect(screen.getByText('Add filter')).toBeInTheDocument();
        expect(screen.getByText('clear-on')).toBeInTheDocument();
        expect(filtersSpy).toHaveBeenCalledWith(expect.objectContaining({
            allowMultiple: true,
            popoverAlign: 'start',
            showClearButton: true
        }));
    });

    it('collapses retention filters for display and expands them on change', () => {
        const onFiltersChange = vi.fn();

        render(
            <MembersFilters
                filters={[{
                    id: '1',
                    field: 'offer_redemptions',
                    operator: 'is-any',
                    values: ['offer_month_1', 'offer_month_2', 'offer_regular']
                }]}
                onFiltersChange={onFiltersChange}
            />
        );

        const filtersProps = filtersSpy.mock.calls.at(-1)?.[0] as {
            filters: Array<{values: string[]}>;
            onChange: (filters: Array<{id: string; field: string; operator: string; values: string[]}>) => void;
        };

        expect(filtersProps.filters).toEqual([{
            id: '1',
            field: 'offer_redemptions',
            operator: 'is-any',
            values: ['retention:month', 'offer_regular']
        }]);

        filtersProps.onChange([{
            id: '1',
            field: 'offer_redemptions',
            operator: 'is-any',
            values: ['retention:month', 'offer_regular']
        }]);

        expect(onFiltersChange).toHaveBeenCalledWith([{
            id: '1',
            field: 'offer_redemptions',
            operator: 'is-any',
            values: ['offer_month_1', 'offer_month_2', 'offer_regular']
        }]);
    });
});
