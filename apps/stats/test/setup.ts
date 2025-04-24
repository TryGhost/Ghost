import '@testing-library/jest-dom';
import {afterEach, vi} from 'vitest';
import {cleanup} from '@testing-library/react';

// Automatically clean up after each test
afterEach(() => {
    cleanup();
});

// Filter out specific React warnings that we can't fix directly
// eslint-disable-next-line no-console
const originalConsoleError = console.error;
// eslint-disable-next-line no-console
console.error = (...args) => {
    // Suppress defaultProps warning from react-svg-map
    // This is in a third-party library and can't be fixed by us
    if (args[0]?.includes('Support for defaultProps will be removed')) {
        return;
    }
    
    // Suppress key warning from table component
    // This should eventually be fixed in the component code
    if (args[0]?.includes('Encountered two children with the same key')) {
        return;
    }

    // Suppress chart dimension warnings
    // These are expected in a headless testing environment
    if (args[0]?.includes('The width(0) and height(0) of chart should be greater than 0')) {
        return;
    }
    
    // Keep original console.error behavior for other messages
    originalConsoleError(...args);
};

// Mock ResizeObserver for charts and responsive components
class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;

// Mock getBoundingClientRect to return non-zero dimensions
// This prevents many chart warnings by providing fake dimensions for DOM elements
Element.prototype.getBoundingClientRect = vi.fn(() => ({
    width: 500,
    height: 500,
    top: 0,
    left: 0,
    right: 500,
    bottom: 500,
    x: 0,
    y: 0,
    toJSON: () => {}
}));
