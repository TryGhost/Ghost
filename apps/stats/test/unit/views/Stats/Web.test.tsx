import React from 'react';
import Web from '@src/views/Stats/Web';
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';

// No need to import the Shade components since we're not using them directly in the test
// They will be imported by the Web component when needed

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
            {pathname: '/test-page-1', visits: 100},
            {pathname: '/test-page-2', visits: 50}
        ],
        loading: false
    }),
    // Mock chart components
    Recharts: {
        LineChart: ({children}: {children: React.ReactNode}) => (
            <div data-testid="line-chart" style={{width: '500px', height: '500px'}}>{children}</div>
        ),
        Line: () => <div data-testid="line" />,
        XAxis: () => <div data-testid="x-axis" />,
        YAxis: () => <div data-testid="y-axis" />
    }
}));

vi.mock('@src/views/Stats/components/AudienceSelect', () => ({
    default: () => <div data-testid="audience-select">Audience Select</div>,
    getAudienceQueryParam: () => 'all'
}));

vi.mock('@src/views/Stats/components/DateRangeSelect', () => ({
    default: () => <div data-testid="date-range-select">Date Range Select</div>
}));

vi.mock('@src/views/Stats/components/WebKpis', () => ({
    default: () => <div data-testid="web-kpis">Web KPIs</div>
}));

vi.mock('@src/views/Stats/layout/StatsLayout', () => ({
    default: ({children}: {children: React.ReactNode}) => <div data-testid="stats-layout">{children}</div>
}));

vi.mock('@src/views/Stats/layout/StatsView', () => ({
    default: ({children}: {children: React.ReactNode}) => <div data-testid="stats-view">{children}</div>
}));

describe('Web View', () => {
    it('renders without crashing', () => {
        render(<Web />);
        
        // Check that the layout components are rendered
        expect(screen.getByTestId('stats-layout')).toBeInTheDocument();
        expect(screen.getByTestId('stats-view')).toBeInTheDocument();
        
        // Check that the header components are rendered
        expect(screen.getByText('Web')).toBeInTheDocument();
        expect(screen.getByTestId('audience-select')).toBeInTheDocument();
        expect(screen.getByTestId('date-range-select')).toBeInTheDocument();
        
        // Check that the content components are rendered
        expect(screen.getByTestId('web-kpis')).toBeInTheDocument();
        expect(screen.getByText('Top content')).toBeInTheDocument();
        
        // Check that data is rendered in the table
        // Use getAllByText for elements that might appear multiple times
        const page1Elements = screen.getAllByText('/test-page-1');
        const page2Elements = screen.getAllByText('/test-page-2');
        const visits100Elements = screen.getAllByText('100');
        const visits50Elements = screen.getAllByText('50');
        
        expect(page1Elements.length).toBeGreaterThan(0);
        expect(page2Elements.length).toBeGreaterThan(0);
        expect(visits100Elements.length).toBeGreaterThan(0);
        expect(visits50Elements.length).toBeGreaterThan(0);
    });
}); 