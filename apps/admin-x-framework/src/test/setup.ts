/**
 * Shared test setup utilities for apps using shade components.
 * Import and call these functions in your app's test setup file.
 */

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

    global.ResizeObserver = ResizeObserverMock;

    // Mock getBoundingClientRect - provides fake dimensions for DOM elements
    // This prevents chart warnings and helps with layout calculations in tests
    const mockGetBoundingClientRect = () => ({
        width: 500,
        height: 500,
        top: 0,
        left: 0,
        right: 500,
        bottom: 500,
        x: 0,
        y: 0,
        toJSON: () => {}
    });

    Element.prototype.getBoundingClientRect = mockGetBoundingClientRect;
} 