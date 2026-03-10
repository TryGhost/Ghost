import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import MembersFilters from './members-filters';

const mockUseBrowseLabels = vi.fn();
const mockUseBrowseTiers = vi.fn();
const mockUseBrowseOffers = vi.fn();
const mockUseBrowseNewsletters = vi.fn();
const mockUseBrowseSettings = vi.fn();
const mockUseBrowseConfig = vi.fn();
const mockUseResourceSearch = vi.fn();

vi.mock('@tryghost/admin-x-framework/api/labels', () => ({
    useBrowseLabels: () => mockUseBrowseLabels()
}));

vi.mock('@tryghost/admin-x-framework/api/tiers', () => ({
    useBrowseTiers: () => mockUseBrowseTiers()
}));

vi.mock('@tryghost/admin-x-framework/api/offers', () => ({
    useBrowseOffers: () => mockUseBrowseOffers()
}));

vi.mock('@tryghost/admin-x-framework/api/newsletters', () => ({
    useBrowseNewsletters: () => mockUseBrowseNewsletters()
}));

vi.mock('@tryghost/admin-x-framework/api/settings', () => ({
    useBrowseSettings: () => mockUseBrowseSettings(),
    getSettingValue: <T,>(settings: Array<{key: string; value: unknown}>, key: string): T | undefined => {
        return settings.find(setting => setting.key === key)?.value as T | undefined;
    }
}));

vi.mock('@tryghost/admin-x-framework/api/config', () => ({
    useBrowseConfig: () => mockUseBrowseConfig()
}));

vi.mock('../hooks/use-resource-search', () => ({
    useResourceSearch: () => mockUseResourceSearch()
}));

describe('MembersFilters', () => {
    function setupCommonMocks() {
        mockUseBrowseLabels.mockReturnValue({
            data: {
                labels: [{id: 'label-1', name: 'VIP', slug: 'vip'}]
            }
        });
        mockUseBrowseTiers.mockReturnValue({data: {tiers: []}});
        mockUseBrowseOffers.mockReturnValue({data: {offers: []}});
        mockUseBrowseNewsletters.mockReturnValue({data: {newsletters: []}});
        mockUseBrowseSettings.mockReturnValue({data: {settings: []}});
        mockUseBrowseConfig.mockReturnValue({data: {config: {labs: {}, emailAnalytics: false}}});
        mockUseResourceSearch.mockReturnValue({
            options: [],
            onSearchChange: vi.fn(),
            searchValue: '',
            isLoading: false
        });
    }

    it('shows a Filter button when no predicates are active', () => {
        setupCommonMocks();

        render(<MembersFilters filters={[]} onFiltersChange={vi.fn()} />);

        expect(screen.getByRole('button', {name: /filter/i})).toHaveTextContent('Filter');
        expect(screen.queryByRole('button', {name: /add filter/i})).not.toBeInTheDocument();
    });

    it('shows an Add filter button when predicates are active', () => {
        setupCommonMocks();

        render(<MembersFilters filters={[
            {id: 'status-1', field: 'status', operator: 'is', values: ['paid']}
        ]} onFiltersChange={vi.fn()} />);

        expect(screen.getByRole('button', {name: /add filter/i})).toHaveTextContent('Add filter');
    });
});
