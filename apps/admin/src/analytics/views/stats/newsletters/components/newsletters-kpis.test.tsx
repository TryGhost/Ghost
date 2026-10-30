import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import NewsletterKPIs from './newsletters-kpis';

const settings = vi.hoisted(() => ({ clicks: true }));

vi.mock('@tryghost/admin-x-framework/api/settings', () => ({
  useEmailTrackClicks: () => settings.clicks,
  useEmailTrackOpens: () => true,
}));
vi.mock('@tryghost/admin-x-framework', () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams()],
}));
vi.mock('@/analytics/providers/analytics-context', () => ({ useAnalytics: () => ({ range: 31 }) }));
vi.mock('@/shared/analytics/chart-helpers', () => ({
  getEffectiveChartRange: () => 31,
  getPeriodText: () => 'in this period',
  sanitizeChartData: (data: unknown) => data,
}));
vi.mock('@tryghost/shade/components', async () => {
  const { createElement, cloneElement } = await import('react');
  const Box = ({ children }: { children?: React.ReactNode }) => createElement('div', null, children);
  return {
    BarChartLoadingIndicator: () => createElement('span', null, 'Loading chart'),
    Button: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => createElement('button', { onClick }, children),
    ChartContainer: Box,
    ChartTooltip: ({ content }: { content: React.ReactElement<Record<string, unknown>> }) => cloneElement(content, {
      active: true,
      payload: [{ value: 0.5, payload: { post_id: 'post-1', post_title: 'Post', send_date: '2026-01-10', sent_to: 100, total_opens: 50, open_rate: 0.5 } }],
    }),
    DropdownMenu: Box,
    DropdownMenuContent: Box,
    DropdownMenuItem: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => createElement('button', { onClick }, children),
    DropdownMenuTrigger: Box,
    EmptyIndicator: ({ title }: { title: string }) => createElement('div', null, title),
    Tabs: Box,
    TabsList: Box,
  };
});
vi.mock('@tryghost/shade/patterns', async () => {
  const { createElement } = await import('react');
  return {
    GhAreaChart: () => createElement('div', null, 'Subscriber chart'),
    KpiDropdownButton: ({ children }: { children?: React.ReactNode }) => createElement('div', null, children),
    KpiTabTrigger: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => createElement('button', { onClick }, children),
    KpiTabValue: ({ label, value }: { label: string; value: string }) => createElement('span', null, createElement('span', null, label), createElement('span', null, value)),
  };
});
vi.mock('@tryghost/shade/utils', async () => {
  const { createElement } = await import('react');
  const Box = ({ children }: { children?: React.ReactNode }) => createElement('div', null, children);
  const Nothing = () => null;
  return {
    Recharts: { BarChart: Box, CartesianGrid: Nothing, XAxis: Nothing, YAxis: Nothing, ReferenceLine: Nothing, Bar: Nothing },
    LucideIcon: { Mail: Nothing },
    calculateYAxisWidth: () => 30,
    formatDisplayDate: (value: string) => value,
    formatNumber: (value: number) => String(value),
    formatPercentage: (value: number) => `${value * 100}%`,
  };
});

afterEach(() => { settings.clicks = true; });

const props = () => ({
  subscribersData: [{ date: '2026-01-01', value: 123 }],
  avgsData: [{ post_id: 'post-1', post_title: 'Post', send_date: '2026-01-10', sent_to: 100, total_opens: 50, open_rate: 0.5 }],
  totals: { totalSubscribers: 123, avgOpenRate: 0.5, avgClickRate: 0 },
  initialTab: 'avg-open-rate',
  isLoading: false,
  isAvgsLoading: false,
  isClicksLoading: false,
  clickError: 'Unable to load click statistics. Please try again.',
  onRetryClickStats: vi.fn(),
  onRetryPeriodStats: vi.fn(),
});

describe('NewsletterKPIs', () => {
  it('keeps open statistics available and retries only failed clicks', () => {
    const inputs = props();
    render(<NewsletterKPIs {...inputs} />);
    const openTab = screen.getAllByText('Avg. open rate')[0].closest('button');
    const clickTab = screen.getAllByText('Avg. click rate')[0].closest('button');
    expect(openTab?.textContent).toContain('50%');
    expect(clickTab?.textContent).toContain('—');
    expect(screen.getByText('Newsletters opens in this period')).toBeTruthy();
    expect(screen.getByText('Clicks').parentElement?.textContent).toContain('—');

    fireEvent.click(clickTab!);
    expect(screen.getByRole('alert').textContent).toContain('Unable to load click statistics');
    fireEvent.click(screen.getByText('Retry'));
    expect(inputs.onRetryClickStats).toHaveBeenCalledTimes(1);
    expect(inputs.onRetryPeriodStats).not.toHaveBeenCalled();
  });

  it('keeps subscribers available while averages load', () => {
    render(<NewsletterKPIs {...props()} clickError={undefined} isAvgsLoading />);
    expect(screen.getAllByText('123').length).toBeGreaterThan(0);
    expect(screen.getByText('Loading chart')).toBeTruthy();
    expect(screen.getAllByText('Avg. open rate')[0].closest('button')?.textContent).toContain('—');
  });

  it('keeps the open chart visible while clicks load', () => {
    render(<NewsletterKPIs {...props()} clickError={undefined} isClicksLoading />);
    expect(screen.getByText('Newsletters opens in this period')).toBeTruthy();
    expect(screen.getAllByText('Avg. click rate')[0].closest('button')?.textContent).toContain('—');
  });

  it('omits click values when tracking is disabled', () => {
    settings.clicks = false;
    render(<NewsletterKPIs {...props()} clickError={undefined} />);
    expect(screen.getByText('Newsletters opens in this period')).toBeTruthy();
    expect(screen.queryByText('Avg. click rate')).toBeNull();
    expect(screen.queryByText('Clicks')).toBeNull();
  });
});
