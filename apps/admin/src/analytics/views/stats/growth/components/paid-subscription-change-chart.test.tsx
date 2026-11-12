import moment from 'moment';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  useMemberCountHistory,
  useMrrHistory,
  useSubscriptionStats,
} from '@tryghost/admin-x-framework/api/stats';

import PaidMembersChangeChart from '@/analytics/views/stats/growth/components/paid-subscription-change-chart';
import { getRangeDates } from '@/shared/analytics/chart-helpers';
import { mockSuccess } from '@tryghost/admin-x-framework/test/hook-testing-utils';
import { useGrowthStats } from '@/analytics/hooks/use-growth-stats';

vi.mock('@tryghost/admin-x-framework/api/stats', () => ({
  useMemberCountHistory: vi.fn(),
  useMrrHistory: vi.fn(),
  useSubscriptionStats: vi.fn(),
}));

// Mock the date-range helper the chart derives its window from
vi.mock('@/shared/analytics/chart-helpers', async () => {
  const actual = await vi.importActual('@/shared/analytics/chart-helpers');
  return {
    ...actual,
    getRangeDates: vi.fn(() => ({
      startDate: moment('2024-01-01'),
      endDate: moment('2024-01-31'),
      timezone: 'UTC',
    })),
  };
});

vi.mock('@tryghost/shade/utils', async () => {
  const actual = await vi.importActual('@tryghost/shade/utils');
  return {
    ...actual,
    formatDisplayDateWithRange: vi.fn((date: string) => `Formatted: ${date}`),
    formatNumber: vi.fn((value: number) => value.toString()),
  };
});

describe('PaidMembersChangeChart Component', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // Helper to generate mock data with dates within the mocked range (2024-01-01 to 2024-01-31)
  const getMockMemberData = () => {
    return [
      { date: '2024-01-10', paid_subscribed: 10, paid_canceled: 2 },
      { date: '2024-01-15', paid_subscribed: 8, paid_canceled: 3 },
      { date: '2024-01-20', paid_subscribed: 12, paid_canceled: 1 },
    ];
  };

  const getMockSubscriptionData = () => {
    return [
      { date: '2024-01-10', signups: 10, cancellations: 2 },
      { date: '2024-01-15', signups: 8, cancellations: 3 },
      { date: '2024-01-20', signups: 12, cancellations: 1 },
    ];
  };

  it('renders with subscription data', () => {
    const mockMemberData = getMockMemberData();
    const mockSubscriptionData = getMockSubscriptionData();

    render(
      <PaidMembersChangeChart
        dateFrom="2024-01-01"
        isLoading={false}
        memberData={mockMemberData}
        range={30}
        subscriptionData={mockSubscriptionData}
      />,
    );

    // Check that the card is rendered
    expect(screen.getByTestId('paid-members-change-card')).toBeInTheDocument();

    // Check that title and description are present
    expect(screen.getByText('Paid subscriptions')).toBeInTheDocument();
    expect(screen.getByText(/New and cancelled paid subscriptions/)).toBeInTheDocument();

    // Check that legend items are present with totals
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('renders with member data when subscription data is not available', () => {
    const mockMemberData = getMockMemberData();

    render(
      <PaidMembersChangeChart
        dateFrom="2024-01-01"
        isLoading={false}
        memberData={mockMemberData}
        range={30}
        subscriptionData={undefined}
      />,
    );

    // Should still render the card
    expect(screen.getByTestId('paid-members-change-card')).toBeInTheDocument();
    expect(screen.getByText('Paid subscriptions')).toBeInTheDocument();
  });

  it('shows resolution dropdown for ranges >= 30 days', () => {
    const mockMemberData = getMockMemberData();
    const mockSubscriptionData = getMockSubscriptionData();

    render(
      <PaidMembersChangeChart
        dateFrom="2024-01-01"
        isLoading={false}
        memberData={mockMemberData}
        range={30}
        subscriptionData={mockSubscriptionData}
      />,
    );

    // Should show the resolution dropdown for 30-day range
    const dropdown = screen.getByRole('combobox');
    expect(dropdown).toBeInTheDocument();
    expect(dropdown).toHaveTextContent('Weekly');
  });

  const previousDay = { date: '2024-01-14', paid_subscribed: 4, paid_canceled: 1 };
  const quietDay = { date: '2024-01-15', paid_subscribed: 0, paid_canceled: 0 };
  const activeDay = { date: '2024-01-15', paid_subscribed: 2, paid_canceled: 1 };
  const nextUtcDay = { date: '2024-01-16', paid_subscribed: 7, paid_canceled: 3 };

  it.each([
    { scenario: 'a quiet UTC day', rows: [previousDay, quietDay], expected: [0, 0] },
    { scenario: 'an active UTC day', rows: [previousDay, activeDay], expected: [2, 1] },
    { scenario: 'Tokyo before UTC midnight', rows: [previousDay], expected: [0, 0] },
    {
      scenario: 'New York after UTC midnight',
      rows: [previousDay, activeDay, nextUtcDay],
      expected: [2, 1],
    },
  ])('shows the selected date’s member changes for $scenario', ({ rows, expected }) => {
    vi.mocked(getRangeDates).mockReturnValueOnce({
      startDate: moment('2024-01-15').startOf('day'),
      endDate: moment('2024-01-15').endOf('day'),
      timezone: 'UTC',
    });
    mockSuccess(vi.mocked(useMemberCountHistory), {
      stats: rows.map((row) => ({ ...row, paid: 10, free: 0, comped: 0, gift: 0 })),
    });
    mockSuccess(vi.mocked(useMrrHistory), { stats: [], meta: { totals: [] } });
    mockSuccess(vi.mocked(useSubscriptionStats), { stats: [] });

    function TodayChart() {
      const { dateFrom, isLoading, memberChangeData, subscriptionData } = useGrowthStats(1);
      return (
        <PaidMembersChangeChart
          dateFrom={dateFrom}
          isLoading={isLoading}
          memberData={memberChangeData}
          range={1}
          subscriptionData={subscriptionData}
        />
      );
    }

    render(<TodayChart />);

    const [signups, cancellations] = expected;
    if (signups === 0 && cancellations === 0) {
      expect(screen.getByText('No paid member changes')).toBeInTheDocument();
    } else {
      expect(screen.getByText('New').parentElement).toHaveTextContent(`New${signups}`);
      expect(screen.getByText('Cancelled').parentElement).toHaveTextContent(
        `Cancelled${cancellations}`,
      );
    }
  });
});
