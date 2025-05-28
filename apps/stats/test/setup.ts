import '@testing-library/jest-dom';
import {afterEach} from 'vitest';
import {cleanup} from '@testing-library/react';
import {setupShadeMocks} from '@tryghost/admin-x-framework/test/setup';

// Automatically clean up after each test
// eslint-disable-next-line
afterEach(() => {
    cleanup();
});

// Set up common mocks for shade components
setupShadeMocks();

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
