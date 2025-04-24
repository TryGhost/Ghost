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
    if (args[0]?.includes('Support for defaultProps will be removed')) {
        return;
    }
    
    // Suppress key warning from table component
    if (args[0]?.includes('Encountered two children with the same key')) {
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
// This prevents the "width(0) and height(0) of chart" warnings
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
