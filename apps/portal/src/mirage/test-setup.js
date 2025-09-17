/**
 * Mirage test setup configuration
 * This file is loaded by Vitest to set up Mirage for all tests
 */

import { beforeEach, afterEach } from 'vitest';
import { makeServer } from './server';

let server;

beforeEach(() => {
    // Create a fresh server instance for each test
    server = makeServer({ environment: 'test' });
});

afterEach(() => {
    // Clean up the server after each test
    if (server) {
        server.shutdown();
        server = null;
    }
});

// Export server for use in tests
export { server };