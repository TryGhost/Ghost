import {afterEach, expect} from 'vitest';
import {cleanup} from '@testing-library/react';
import {fetch} from 'cross-fetch';
import matchers from '@testing-library/jest-dom/matchers';

// TODO: remove this once we're switched `jest` to `vi` in code
// eslint-disable-next-line no-undef
globalThis.jest = vi;

// eslint-disable-next-line no-undef
globalThis.fetch = fetch;

// Add the cleanup function for React testing library
afterEach(cleanup);

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
expect.extend(matchers);

// Polyfill ResizeObserver for libraries that rely on it (e.g., input-otp)
// eslint-disable-next-line no-undef
if (typeof globalThis.ResizeObserver === 'undefined') {
    class ResizeObserverPolyfill {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    // eslint-disable-next-line no-undef
    globalThis.ResizeObserver = ResizeObserverPolyfill;
}
