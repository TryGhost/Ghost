import * as matchers from '@testing-library/jest-dom/matchers';
import {afterEach, expect} from 'vitest';
import {cleanup} from '@testing-library/react';

// Add the cleanup function for React testing library
afterEach(cleanup);

expect.extend(matchers);
