import {vi} from 'vitest';

/**
 * Sets up mocks for Shade components used in tests
 * Note: We use mock implementations that don't rely on JSX syntax
 */
export const setupShadeMocks = () => {
    vi.mock('@tryghost/shade', () => ({
        H1: function H1({children}: {children: unknown}) {
            // Create a mock h1 element
            return {
                'data-testid': 'h1',
                children,
                toString: () => `<h1 data-testid="h1">${children}</h1>`
            };
        },
        ViewHeader: function ViewHeader({children}: {children: unknown}) {
            // Create a mock div element
            return {
                'data-testid': 'view-header',
                children,
                toString: () => `<div data-testid="view-header">${children}</div>`
            };
        }
    }));
};

/**
 * Sets up mocks for Stats layout components
 * Note: We use mock implementations that don't rely on JSX syntax
 */
export const setupStatsLayoutMocks = () => {
    vi.mock('@src/views/Stats/layout/StatsLayout', () => ({
        default: function StatsLayout({children}: {children: unknown}) {
            // Create a mock div element
            return {
                'data-testid': 'stats-layout',
                children,
                toString: () => `<div data-testid="stats-layout">${children}</div>`
            };
        }
    }));

    vi.mock('@src/views/Stats/layout/StatsView', () => ({
        default: function StatsView({children}: {children: unknown}) {
            // Create a mock div element
            return {
                'data-testid': 'stats-view',
                children,
                toString: () => `<div data-testid="stats-view">${children}</div>`
            };
        }
    }));
}; 