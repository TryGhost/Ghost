import {afterEach} from 'vitest';
import {cleanup} from '@testing-library/react';
import {fetch} from 'cross-fetch';
import '@testing-library/jest-dom/vitest';

// eslint-disable-next-line no-undef
globalThis.fetch = fetch;

// Add the cleanup function for React testing library
afterEach(cleanup);
