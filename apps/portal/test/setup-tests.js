import * as matchers from '@testing-library/jest-dom/matchers';
import {afterEach, expect} from 'vitest';
import {cleanup} from '@testing-library/react';
import {fetch} from 'cross-fetch';

// eslint-disable-next-line no-undef
globalThis.fetch = fetch;

// Add the cleanup function for React testing library
afterEach(cleanup);

expect.extend(matchers);
