import {vi} from 'vitest';

/**
 * Mock for React's useMemo that just calls the function directly
 * Use this to simplify testing of components that use useMemo
 * 
 * @example
 * // In your test file:
 * import {setupReactMocks} from '../../../test/mocks/react';
 * 
 * // Setup before tests
 * setupReactMocks();
 */
export const setupReactMocks = () => {
    vi.mock('react', () => {
        const original = vi.importActual('react');
        return {
            ...original,
            useMemo: <T>(fn: () => T) => fn()
        };
    });
}; 