/* eslint-disable ghost/sort-imports-es6-autofix/sort-imports-es6 */
import React from 'react';
import '@testing-library/jest-dom';
import {render, screen} from '@testing-library/react';
import {TopLevelFrameworkProps} from '@tryghost/admin-x-framework';
import {ShadeAppProps} from '@tryghost/shade';
import App from '../../src/App';
import {vi} from 'vitest';

// Interface matching the one in App.tsx
interface AppProps {
    framework: TopLevelFrameworkProps;
    designSystem: ShadeAppProps;
}

// Mock the dependencies
vi.mock('@tryghost/admin-x-framework', () => ({
    FrameworkProvider: ({children}: {children: React.ReactNode}) => <div data-testid="framework-provider">{children}</div>,
    RouterProvider: ({children}: {children: React.ReactNode}) => <div data-testid="router-provider">{children}</div>,
    AppProvider: ({children}: {children: React.ReactNode}) => <div data-testid="app-provider">{children}</div>,
    Outlet: () => <div data-testid="outlet">Outlet content</div>
}));

vi.mock('@tryghost/shade', () => ({
    ShadeApp: ({children}: {children: React.ReactNode}) => <div data-testid="shade-app">{children}</div>,
    formatNumber: (value: number) => `${value}`,
    formatDisplayDate: (date: string) => date,
    formatPercentage: (value: number) => `${Math.round(value * 100)}%`,
    formatDuration: (seconds: number) => `${seconds}s`
}));

vi.mock('../../src/providers/GlobalDataProvider', () => ({
    default: ({children}: {children: React.ReactNode}) => <div data-testid="global-data-provider">{children}</div>
}));

describe('App Component', function () {
    it('renders without crashing', function () {
        // Use type assertion to bypass strict type checking for the test
        const mockProps = {
            designSystem: {darkMode: false, fetchKoenigLexical: null},
            framework: {} 
        } as unknown as AppProps;
        
        render(<App {...mockProps} />);
    
        // Verify the component tree renders
        expect(screen.getByTestId('framework-provider')).toBeInTheDocument();
        expect(screen.getByTestId('app-provider')).toBeInTheDocument();
        expect(screen.getByTestId('router-provider')).toBeInTheDocument();
        expect(screen.getByTestId('global-data-provider')).toBeInTheDocument();
        expect(screen.getByTestId('shade-app')).toBeInTheDocument();
        expect(screen.getByTestId('outlet')).toBeInTheDocument();
    });
});
