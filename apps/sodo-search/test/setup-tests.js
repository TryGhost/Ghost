import '@testing-library/jest-dom/vitest';
import {afterEach} from 'vitest';
import {cleanup} from '@testing-library/react';
import {fetch} from 'cross-fetch';

// TODO: remove this once we're switched `jest` to `vi` in code
// eslint-disable-next-line no-undef
globalThis.jest = vi;

// eslint-disable-next-line no-undef
globalThis.fetch = fetch;

// Add the cleanup function for React testing library
afterEach(cleanup);

// jest-dom (imported above as /vitest) registers custom matchers for asserting
// on DOM nodes, e.g. expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
