import NewSubscribersCadence from '@src/views/Stats/Growth/components/new-subscribers-cadence';
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
        formatNumber: vi.fn((value: number) => value.toString()),
        getRangeDates: vi.fn((range: number) => {
            // Mock date range calculation
            const endDate = new Date('2024-01-31');
            const startDate = new Date('2024-01-01');
            if (range === 30) {
                startDate.setDate(endDate.getDate() - 30);
            }
            return {startDate, endDate};
        }),
        formatQueryDate: vi.fn((date: Date) => date.toISOString().split('T')[0])
    };
});

import {useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {useMemberCountHistory, useSubscriptionStats} from '@tryghost/admin-x-framework/api/stats';

const mockedUseSubscriptionStats = useSubscriptionStats as ReturnType<typeof vi.fn>;
const mockedUseMemberCountHistory = useMemberCountHistory as ReturnType<typeof vi.fn>;
const mockedUseBrowseTiers = useBrowseTiers as ReturnType<typeof vi.fn>;

describe('NewSubscribersCadence Component', () => {
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
            stats: [
                {date: '2024-01-01', paid: 100, free: 50, comped: 0},
                {date: '2024-01-31', paid: 120, free: 60, comped: 0}
            ],
            meta: {
                totals: {
                    paid: 120,
                    free: 60,
                    comped: 0
                }
            }
        });
    });

    it('renders with mixed monthly/yearly signups and calculates percentages correctly', () => {
        // Mock stats with signups data (date-filtered data)
        const mockSubscriptionData = {
            stats: [
                {date: '2024-01-15', tier: 'tier-1', cadence: 'month', signups: 45, cancellations: 5, count: 100},
                {date: '2024-01-15', tier: 'tier-1', cadence: 'year', signups: 15, cancellations: 2, count: 50},
                {date: '2024-01-20', tier: 'tier-1', cadence: 'month', signups: 30, cancellations: 3, count: 110},
                {date: '2024-01-20', tier: 'tier-1', cadence: 'year', signups: 10, cancellations: 1, count: 55}
            ],
            meta: {
                totals: [
                    {tier: 'tier-1', cadence: 'month', count: 110},
                    {tier: 'tier-1', cadence: 'year', count: 55}
                ]
            }
        };

        mockSuccess(mockedUseSubscriptionStats, mockSubscriptionData);

        render(<NewSubscribersCadence isLoading={false} range={30} />);

        // Check that the component renders with title
        expect(screen.getByText('Paid subscription breakdown')).toBeInTheDocument();

        // Check that both cadence types are shown
        expect(screen.getByText('Monthly')).toBeInTheDocument();
        expect(screen.getByText('Annual')).toBeInTheDocument();

        // Total signups: monthly = 45 + 30 = 75, annual = 15 + 10 = 25, total = 100
        // Percentages: 75% and 25%
        expect(screen.getByText('75%')).toBeInTheDocument();
        expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('shows empty state with no signups in date range', () => {
        const mockEmptyData = {
            stats: [],
            meta: {
                totals: []
            }
        };

        mockSuccess(mockedUseSubscriptionStats, mockEmptyData);

        render(<NewSubscribersCadence isLoading={false} range={30} />);

        // Should show empty state with period-specific message
        expect(screen.getByText('No new subscribers')).toBeInTheDocument();
    });

    it('aggregates signups across all tiers for billing period breakdown', () => {
        const mockMultipleTiers = {
            tiers: [
                {id: 'tier-1', name: 'Premium', type: 'paid', active: true},
                {id: 'tier-2', name: 'Pro', type: 'paid', active: true}
            ]
        };

        mockSuccess(mockedUseBrowseTiers, mockMultipleTiers);

        const mockSubscriptionData = {
            stats: [
                {date: '2024-01-15', tier: 'tier-1', cadence: 'month', signups: 60, cancellations: 5, count: 100},
                {date: '2024-01-15', tier: 'tier-1', cadence: 'year', signups: 40, cancellations: 3, count: 50},
                {date: '2024-01-15', tier: 'tier-2', cadence: 'month', signups: 15, cancellations: 2, count: 30},
                {date: '2024-01-15', tier: 'tier-2', cadence: 'year', signups: 10, cancellations: 1, count: 20}
            ],
            meta: {
                totals: [
                    {tier: 'tier-1', cadence: 'month', count: 100},
                    {tier: 'tier-1', cadence: 'year', count: 50},
                    {tier: 'tier-2', cadence: 'month', count: 30},
                    {tier: 'tier-2', cadence: 'year', count: 20}
                ]
            }
        };

        mockSuccess(mockedUseSubscriptionStats, mockSubscriptionData);

        render(<NewSubscribersCadence isLoading={false} range={30} />);

        // Should aggregate signups: monthly = 60 + 15 = 75, annual = 40 + 10 = 50, total = 125
        // Percentages: 60% monthly, 40% annual
        expect(screen.getByText('Monthly')).toBeInTheDocument();
        expect(screen.getByText('Annual')).toBeInTheDocument();
        expect(screen.getByText('60%')).toBeInTheDocument();
        expect(screen.getByText('40%')).toBeInTheDocument();
    });

    it('includes complimentary member signups when comped count increases in date range', () => {
        const mockSubscriptionData = {
            stats: [
                {date: '2024-01-15', tier: 'tier-1', cadence: 'month', signups: 50, cancellations: 5, count: 100},
                {date: '2024-01-15', tier: 'tier-1', cadence: 'year', signups: 30, cancellations: 3, count: 50}
            ],
            meta: {
                totals: [
                    {tier: 'tier-1', cadence: 'month', count: 100},
                    {tier: 'tier-1', cadence: 'year', count: 50}
                ]
            }
        };

        mockSuccess(mockedUseSubscriptionStats, mockSubscriptionData);

        // Mock complimentary member increase (comped went from 5 to 25 = 20 new comped)
        mockSuccess(mockedUseMemberCountHistory, {
            stats: [
                {date: '2024-01-01', paid: 80, free: 50, comped: 5},
                {date: '2024-01-31', paid: 100, free: 60, comped: 25}
            ],
            meta: {
                totals: {
                    paid: 100,
                    free: 60,
                    comped: 25
                }
            }
        });

        render(<NewSubscribersCadence isLoading={false} range={30} />);

        // Should show all three: Monthly (50), Annual (30), Complimentary (20) = 100 total
        expect(screen.getByText('Monthly')).toBeInTheDocument();
        expect(screen.getByText('Annual')).toBeInTheDocument();
        expect(screen.getByText('Complimentary')).toBeInTheDocument();

        // Check percentages: 50/100 = 50%, 30/100 = 30%, 20/100 = 20%
        expect(screen.getByText('50%')).toBeInTheDocument();
        expect(screen.getByText('30%')).toBeInTheDocument();
        expect(screen.getByText('20%')).toBeInTheDocument();
    });

    it('does not show complimentary when comped count does not increase', () => {
        const mockSubscriptionData = {
            stats: [
                {date: '2024-01-15', tier: 'tier-1', cadence: 'month', signups: 75, cancellations: 5, count: 100},
                {date: '2024-01-15', tier: 'tier-1', cadence: 'year', signups: 25, cancellations: 3, count: 50}
            ],
            meta: {
                totals: [
                    {tier: 'tier-1', cadence: 'month', count: 100},
                    {tier: 'tier-1', cadence: 'year', count: 50}
                ]
            }
        };

        mockSuccess(mockedUseSubscriptionStats, mockSubscriptionData);

        // No complimentary member increase (comped stays the same)
        mockSuccess(mockedUseMemberCountHistory, {
            stats: [
                {date: '2024-01-01', paid: 100, free: 50, comped: 10},
                {date: '2024-01-31', paid: 120, free: 60, comped: 10}
            ],
            meta: {
                totals: {
                    paid: 120,
                    free: 60,
                    comped: 10
                }
            }
        });

        render(<NewSubscribersCadence isLoading={false} range={30} />);

        expect(screen.getByText('Monthly')).toBeInTheDocument();
        expect(screen.getByText('Annual')).toBeInTheDocument();
        expect(screen.queryByText('Complimentary')).not.toBeInTheDocument();
    });

    it('hides breakdown type dropdown when only one tier is available', () => {
        // Single tier setup (from beforeEach default)
        const mockSubscriptionData = {
            stats: [
                {date: '2024-01-15', tier: 'tier-1', cadence: 'month', signups: 50, cancellations: 5, count: 100}
            ],
            meta: {
                totals: [
                    {tier: 'tier-1', cadence: 'month', count: 100}
                ]
            }
        };

        mockSuccess(mockedUseSubscriptionStats, mockSubscriptionData);

        render(<NewSubscribersCadence isLoading={false} range={30} />);

        // Should not show the dropdown when there's only one tier
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('shows breakdown type dropdown when multiple tiers are available', () => {
        const mockMultipleTiers = {
            tiers: [
                {id: 'tier-1', name: 'Premium', type: 'paid', active: true},
                {id: 'tier-2', name: 'Pro', type: 'paid', active: true}
            ]
        };

        mockSuccess(mockedUseBrowseTiers, mockMultipleTiers);

        const mockSubscriptionData = {
            stats: [
                {date: '2024-01-15', tier: 'tier-1', cadence: 'month', signups: 50, cancellations: 5, count: 100},
                {date: '2024-01-15', tier: 'tier-2', cadence: 'month', signups: 25, cancellations: 2, count: 50}
            ],
            meta: {
                totals: [
                    {tier: 'tier-1', cadence: 'month', count: 100},
                    {tier: 'tier-2', cadence: 'month', count: 50}
                ]
            }
        };

        mockSuccess(mockedUseSubscriptionStats, mockSubscriptionData);

        render(<NewSubscribersCadence isLoading={false} range={30} />);

        // Should show the dropdown when there are multiple tiers
        expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
});
