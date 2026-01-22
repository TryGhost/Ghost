import CadenceBreakdown from '@src/views/Stats/Growth/components/cadence-breakdown';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {mockSuccess} from '@tryghost/admin-x-framework/test/hook-testing-utils';
import {render, screen} from '@testing-library/react';

// Mock the API hooks
vi.mock('@tryghost/admin-x-framework/api/stats', () => ({
    useSubscriptionStats: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework/api/tiers', () => ({
    useBrowseTiers: vi.fn()
}));

// Mock @tryghost/shade components
vi.mock('@tryghost/shade', async () => {
    const actual = await vi.importActual('@tryghost/shade');
    return {
        ...actual,
        formatNumber: vi.fn((value: number) => value.toString())
    };
});

import {useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {useSubscriptionStats} from '@tryghost/admin-x-framework/api/stats';

const mockedUseSubscriptionStats = useSubscriptionStats as ReturnType<typeof vi.fn>;
const mockedUseBrowseTiers = useBrowseTiers as ReturnType<typeof vi.fn>;

describe('CadenceBreakdown Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock for tiers - single tier
        mockSuccess(mockedUseBrowseTiers, {
            tiers: [
                {id: 'tier-1', name: 'Premium', type: 'paid', active: true}
            ]
        });
    });

    it('renders with mixed monthly/yearly subscriptions and calculates percentages correctly', () => {
        const mockSubscriptionData = {
            meta: {
                totals: [
                    {tier: 'tier-1', cadence: 'month', count: 75},
                    {tier: 'tier-1', cadence: 'year', count: 25}
                ]
            }
        };

        mockSuccess(mockedUseSubscriptionStats, mockSubscriptionData);

        render(<CadenceBreakdown isLoading={false} />);

        // Check that the component renders
        expect(screen.getByText('Subscription breakdown')).toBeInTheDocument();
        expect(screen.getByText('Paid subscriptions by billing period')).toBeInTheDocument();

        // Check that both cadence types are shown
        expect(screen.getByText('Monthly')).toBeInTheDocument();
        expect(screen.getByText('Annual')).toBeInTheDocument();

        // Check that percentages are calculated correctly (75% and 25%)
        expect(screen.getByText('75.0%')).toBeInTheDocument();
        expect(screen.getByText('25.0%')).toBeInTheDocument();
    });

    it('shows empty state with no paid subscriptions', () => {
        const mockEmptyData = {
            meta: {
                totals: []
            }
        };

        mockSuccess(mockedUseSubscriptionStats, mockEmptyData);

        const {container} = render(<CadenceBreakdown isLoading={false} />);

        // Component should not render when there's no data
        expect(container.firstChild).toBeNull();
    });

    it('returns null when loading', () => {
        mockSuccess(mockedUseSubscriptionStats, {
            meta: {
                totals: [
                    {tier: 'tier-1', cadence: 'month', count: 100}
                ]
            }
        });

        const {container} = render(<CadenceBreakdown isLoading={true} />);

        expect(container.firstChild).toBeNull();
    });

    it('handles only monthly subscriptions', () => {
        const mockMonthlyOnlyData = {
            meta: {
                totals: [
                    {tier: 'tier-1', cadence: 'month', count: 100}
                ]
            }
        };

        mockSuccess(mockedUseSubscriptionStats, mockMonthlyOnlyData);

        render(<CadenceBreakdown isLoading={false} />);

        expect(screen.getByText('Monthly')).toBeInTheDocument();
        expect(screen.getByText('100.0%')).toBeInTheDocument();
        expect(screen.queryByText('Annual')).not.toBeInTheDocument();
    });

    it('handles only annual subscriptions', () => {
        const mockAnnualOnlyData = {
            meta: {
                totals: [
                    {tier: 'tier-1', cadence: 'year', count: 50}
                ]
            }
        };

        mockSuccess(mockedUseSubscriptionStats, mockAnnualOnlyData);

        render(<CadenceBreakdown isLoading={false} />);

        expect(screen.getByText('Annual')).toBeInTheDocument();
        expect(screen.getByText('100.0%')).toBeInTheDocument();
        expect(screen.queryByText('Monthly')).not.toBeInTheDocument();
    });

    it('shows breakdown type selector with correct options', () => {
        const mockSubscriptionData = {
            meta: {
                totals: [
                    {tier: 'tier-1', cadence: 'month', count: 100}
                ]
            }
        };

        mockSuccess(mockedUseSubscriptionStats, mockSubscriptionData);

        render(<CadenceBreakdown isLoading={false} />);

        // Should show breakdown type selector
        expect(screen.getByText('Billing period')).toBeInTheDocument();
    });

    it('aggregates across all tiers for billing period breakdown', () => {
        const mockMultipleTiers = {
            tiers: [
                {id: 'tier-1', name: 'Premium', type: 'paid', active: true},
                {id: 'tier-2', name: 'Pro', type: 'paid', active: true}
            ]
        };

        mockSuccess(mockedUseBrowseTiers, mockMultipleTiers);

        const mockSubscriptionData = {
            meta: {
                totals: [
                    {tier: 'tier-1', cadence: 'month', count: 60},
                    {tier: 'tier-1', cadence: 'year', count: 40},
                    {tier: 'tier-2', cadence: 'month', count: 15},
                    {tier: 'tier-2', cadence: 'year', count: 10}
                ]
            }
        };

        mockSuccess(mockedUseSubscriptionStats, mockSubscriptionData);

        render(<CadenceBreakdown isLoading={false} />);

        // Should aggregate: (60 + 15) / 125 = 60%, (40 + 10) / 125 = 40%
        expect(screen.getByText('Monthly')).toBeInTheDocument();
        expect(screen.getByText('Annual')).toBeInTheDocument();
        expect(screen.getByText('60.0%')).toBeInTheDocument();
        expect(screen.getByText('40.0%')).toBeInTheDocument();
    });
});
