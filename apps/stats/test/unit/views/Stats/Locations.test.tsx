import Locations from '@src/views/Stats/Locations';
import React from 'react';
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';

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

vi.mock('@tinybirdco/charts', () => ({
    useQuery: () => ({
        data: [
            {country: 'United States', visits: 100},
            {country: 'United Kingdom', visits: 50}
        ],
        loading: false
    })
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

describe('Locations View', () => {
    it('renders without crashing', () => {
        render(<Locations />);
        
        // Check that the layout components are rendered
        expect(screen.getByTestId('stats-layout')).toBeInTheDocument();
        expect(screen.getByTestId('stats-view')).toBeInTheDocument();
        
        // Check that the header components are rendered
        expect(screen.getByText('Locations')).toBeInTheDocument();
        expect(screen.getByTestId('audience-select')).toBeInTheDocument();
        expect(screen.getByTestId('date-range-select')).toBeInTheDocument();
        
        // Check that the map is displayed
        expect(screen.getByText('Country')).toBeInTheDocument();
        expect(screen.getByLabelText('Map of World')).toBeInTheDocument();
    });
}); 