import React from 'react';
import Sources from '@src/views/Stats/Sources';
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';

// No need to import the Shade components since we're not using them directly in the test
// They will be imported by the Sources component when needed

// Only mock non-UI dependencies
vi.mock('@src/providers/GlobalDataProvider', () => ({
    useGlobalData: () => ({
        statsConfig: {id: 'test-id'},
        isLoading: false,
        range: 'last-7-days',
        audience: 'all'
    })
}));

vi.mock('@src/utils/chart-helpers', () => ({
    getRangeDates: () => ({
        startDate: {format: () => '2023-01-01'},
        endDate: {format: () => '2023-01-07'},
        timezone: 'UTC'
    }),
    getPeriodText: () => 'in the last 7 days',
    getCountryFlag: () => '🏳️'
}));

vi.mock('@src/config/stats-config', () => ({
    getStatEndpointUrl: () => 'https://api.example.com/stats',
    getToken: () => 'test-token'
}));

// Mock chart components to avoid width/height warnings
vi.mock('@tinybirdco/charts', () => ({
    useQuery: () => ({
        data: [
            {source: 'Google', visits: 100},
            {source: 'Twitter', visits: 50}
        ],
        loading: false
    }),
    // Mock the PieChart to prevent the width/height warnings
    Recharts: {
        PieChart: ({children}: {children: React.ReactNode}) => (
            <div data-testid="pie-chart" style={{width: '500px', height: '500px'}}>{children}</div>
        ),
        PieArcSeries: () => <div data-testid="pie-arc-series" />,
        PieArc: () => <div data-testid="pie-arc" />
    }
}));

vi.mock('@src/views/Stats/components/AudienceSelect', () => ({
    default: () => <div data-testid="audience-select">Audience Select</div>,
    getAudienceQueryParam: () => 'all'
}));

vi.mock('@src/views/Stats/components/DateRangeSelect', () => ({
    default: () => <div data-testid="date-range-select">Date Range Select</div>
}));

vi.mock('@src/views/Stats/layout/StatsLayout', () => ({
    default: ({children}: {children: React.ReactNode}) => <div data-testid="stats-layout">{children}</div>
}));

vi.mock('@src/views/Stats/layout/StatsView', () => ({
    default: ({children}: {children: React.ReactNode}) => <div data-testid="stats-view">{children}</div>
}));

describe('Sources View', () => {
    it('renders without crashing', () => {
        render(<Sources />);
        
        // Check that the layout components are rendered
        expect(screen.getByTestId('stats-layout')).toBeInTheDocument();
        expect(screen.getByTestId('stats-view')).toBeInTheDocument();
        
        // Check that the header components are rendered
        expect(screen.getByText('Sources')).toBeInTheDocument();
        expect(screen.getByTestId('audience-select')).toBeInTheDocument();
        expect(screen.getByTestId('date-range-select')).toBeInTheDocument();
        
        // Check that the data is displayed
        expect(screen.getByText('Top Sources')).toBeInTheDocument();
        
        // Use getAllByText since "Google" and "Twitter" appear multiple times in the chart and table
        const googleElements = screen.getAllByText('Google');
        const twitterElements = screen.getAllByText('Twitter');
        
        expect(googleElements.length).toBeGreaterThan(0);
        expect(twitterElements.length).toBeGreaterThan(0);
    });
}); 