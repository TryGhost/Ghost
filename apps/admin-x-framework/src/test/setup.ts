/**
 * Shared test setup utilities for apps using shade components.
 * Import and call these functions in your app's test setup file.
 */

import {setupConsoleFiltering} from './test-utils';

/**
 * Sets up common mocks required for shade components in tests.
 * Call this in your app's test setup file.
 */
export function setupShadeMocks() {
    // Mock window.matchMedia - required for shade components that use responsive behavior
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => {}, // deprecated
            removeListener: () => {}, // deprecated
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => {}
        })
    });

    // Mock ResizeObserver - required for charts and responsive components
    class ResizeObserverMock {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    
    Object.defineProperty(window, 'ResizeObserver', {
        writable: true,
        value: ResizeObserverMock
    });

    // Mock getBoundingClientRect - required for positioning calculations
    Element.prototype.getBoundingClientRect = () => ({
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        x: 0,
        y: 0,
        toJSON: () => {}
    });
}

/**
 * Sets up console filtering for common warnings that can't be fixed.
 * This is separate from setupShadeMocks so apps can choose which to use.
 */
export function setupConsoleFilters() {
    return setupConsoleFiltering({
        suppressReactWarnings: true,
        suppressChartWarnings: true,
        suppressMessages: [
            'Encountered two children with the same key'
        ]
    });
} 