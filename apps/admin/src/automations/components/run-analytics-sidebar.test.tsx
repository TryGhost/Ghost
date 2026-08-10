import RunAnalyticsSidebar from './run-analytics-sidebar';
import type {GhAreaChartDataItem} from '@tryghost/shade/patterns';
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';

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
