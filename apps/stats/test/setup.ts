import '@testing-library/jest-dom';
import {afterEach} from 'vitest';
import {cleanup} from '@testing-library/react';
import {setupConsoleFilters, setupShadeMocks} from '@tryghost/admin-x-framework/test/setup';

// Automatically clean up after each test
// eslint-disable-next-line
afterEach(() => {
    cleanup();
});

// Set up common mocks for shade components
setupShadeMocks();

// Set up console filtering for common warnings
setupConsoleFilters();
