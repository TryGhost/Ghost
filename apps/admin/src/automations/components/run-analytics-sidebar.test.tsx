import RunAnalyticsSidebar from './run-analytics-sidebar';
import type {GhAreaChartDataItem} from '@tryghost/shade/patterns';
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';

vi.mock('@tryghost/admin-x-framework/api/automations', async () => {
    const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework/api/automations')>('@tryghost/admin-x-framework/api/automations');
    return {
        ...actual,
        useBrowseAutomationRunAnalytics: () => ({
            data: {
                automation_run_analytics: [{
                    automation_id: 'automation-id-1',
                    total_runs: 1432,
                    in_progress: 118,
                    completed: 1225,
                    last_run_at: '2026-07-21T07:12:00Z',
                    runs_by_day: Array.from({length: 30}, (_, index) => ({date: `2026-07-${index + 1}`, count: index}))
                }]
            }
        })
    };
});

vi.mock('@tryghost/shade/patterns', () => ({
    GhAreaChart: ({data}: {data: GhAreaChartDataItem[]}) => <div data-point-count={data.length} data-testid="runs-chart" />
}));

describe('RunAnalyticsSidebar', () => {
    it('shows the run graph and only the requested run status totals', () => {
        render(
            <RunAnalyticsSidebar automation={{
                id: 'automation-id-1',
                name: 'Free member welcome flow',
                slug: 'member-welcome-email-free',
                status: 'active'
            }} />
        );

        expect(screen.getByTestId('runs-chart')).toHaveAttribute('data-point-count', '30');
        expect(screen.getByText('Total runs')).toBeInTheDocument();
        expect(screen.getByText('1,432')).toBeInTheDocument();
        expect(screen.getByText('In progress')).toBeInTheDocument();
        expect(screen.getByText('118')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('1,225')).toBeInTheDocument();
        expect(screen.queryByText('Upgraded')).not.toBeInTheDocument();
        expect(screen.queryByText('Unsubscribed')).not.toBeInTheDocument();
    });
});
