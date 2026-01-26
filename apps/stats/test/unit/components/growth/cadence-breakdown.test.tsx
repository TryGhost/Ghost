import CadenceBreakdown from '@src/views/Stats/Growth/components/cadence-breakdown';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {mockSuccess} from '@tryghost/admin-x-framework/test/hook-testing-utils';
import {render, screen} from '@testing-library/react';

// Mock the API hooks
vi.mock('@tryghost/admin-x-framework/api/stats', () => ({
    useSubscriptionStats: vi.fn(),
    useMemberCountHistory: vi.fn()
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
import {useMemberCountHistory, useSubscriptionStats} from '@tryghost/admin-x-framework/api/stats';

const mockedUseSubscriptionStats = useSubscriptionStats as ReturnType<typeof vi.fn>;
const mockedUseMemberCountHistory = useMemberCountHistory as ReturnType<typeof vi.fn>;
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

        // Default mock for member count history - no complimentary members
        mockSuccess(mockedUseMemberCountHistory, {
            stats: [],
            meta: {
                totals: {
                    paid: 100,
                    free: 50,
                    comped: 0
                }
            }
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
        expect(screen.getByText('Active paid subscriptions')).toBeInTheDocument();

        // Check that both cadence types are shown
        expect(screen.getByText('Monthly')).toBeInTheDocument();
        expect(screen.getByText('Annual')).toBeInTheDocument();

        // Check that percentages are calculated correctly (75% and 25%)
        expect(screen.getByText('75%')).toBeInTheDocument();
        expect(screen.getByText('25%')).toBeInTheDocument();
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
        expect(screen.getByText('100%')).toBeInTheDocument();
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
        expect(screen.getByText('100%')).toBeInTheDocument();
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
        expect(screen.getByText('60%')).toBeInTheDocument();
        expect(screen.getByText('40%')).toBeInTheDocument();
    });

    it('includes complimentary members in billing period breakdown', () => {
        const mockSubscriptionData = {
            meta: {
                totals: [
                    {tier: 'tier-1', cadence: 'month', count: 50},
                    {tier: 'tier-1', cadence: 'year', count: 30}
                ]
            }
        };

        mockSuccess(mockedUseSubscriptionStats, mockSubscriptionData);

        // Mock complimentary members
        mockSuccess(mockedUseMemberCountHistory, {
            stats: [],
            meta: {
                totals: {
                    paid: 80,
                    free: 50,
                    comped: 20
                }
            }
        });

        render(<CadenceBreakdown isLoading={false} />);

        // Should show all three: Monthly (50), Annual (30), Complimentary (20) = 100 total
        expect(screen.getByText('Monthly')).toBeInTheDocument();
        expect(screen.getByText('Annual')).toBeInTheDocument();
        expect(screen.getByText('Complimentary')).toBeInTheDocument();

        // Check percentages: 50/100 = 50%, 30/100 = 30%, 20/100 = 20%
        expect(screen.getByText('50%')).toBeInTheDocument();
        expect(screen.getByText('30%')).toBeInTheDocument();
        expect(screen.getByText('20%')).toBeInTheDocument();
    });

    it('does not show complimentary when count is zero', () => {
        const mockSubscriptionData = {
            meta: {
                totals: [
                    {tier: 'tier-1', cadence: 'month', count: 75},
                    {tier: 'tier-1', cadence: 'year', count: 25}
                ]
            }
        };

        mockSuccess(mockedUseSubscriptionStats, mockSubscriptionData);

        // No complimentary members (default mock has comped: 0)
        mockSuccess(mockedUseMemberCountHistory, {
            stats: [],
            meta: {
                totals: {
                    paid: 100,
                    free: 50,
                    comped: 0
                }
            }
        });

        render(<CadenceBreakdown isLoading={false} />);

        expect(screen.getByText('Monthly')).toBeInTheDocument();
        expect(screen.getByText('Annual')).toBeInTheDocument();
        expect(screen.queryByText('Complimentary')).not.toBeInTheDocument();
    });

    it('handles only complimentary members with no paid subscriptions', () => {
        const mockSubscriptionData = {
            meta: {
                totals: []
            }
        };

        mockSuccess(mockedUseSubscriptionStats, mockSubscriptionData);

        // Only complimentary members
        mockSuccess(mockedUseMemberCountHistory, {
            stats: [],
            meta: {
                totals: {
                    paid: 0,
                    free: 50,
                    comped: 25
                }
            }
        });

        const {container} = render(<CadenceBreakdown isLoading={false} />);

        // Component should not render when subscription stats has no totals
        // (even if there are complimentary members, the check is on subscription stats)
        expect(container.firstChild).toBeNull();
    });
});
