import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Add the cleanup function for React testing library
afterEach(cleanup);
