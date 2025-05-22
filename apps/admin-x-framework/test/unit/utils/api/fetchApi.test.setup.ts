/* eslint-disable ghost/mocha/no-top-level-hooks */
/**
 * Setup file for fetchApi tests
 * 
 * This file initializes MSW server once and exports it
 * to be used across multiple tests
 */

import {http, HttpResponse} from '../../../../src/test/msw';
import {setupServer} from 'msw/node';
import {afterAll, afterEach, beforeAll} from 'vitest';

// Create a default handler for API tests
const defaultHandlers = [
    http.post('http://localhost:3000/ghost/api/admin/test/', () => {
        return HttpResponse.json({test: 1});
    })
];

// Create a server with initial handlers
export const server = setupServer(...defaultHandlers);

// Start the server before all tests
beforeAll(function () {
    server.listen();
});

// Reset handlers after each test
afterEach(function () {
    server.resetHandlers();
});

// Close server after all tests
afterAll(function () {
    server.close();
}); 