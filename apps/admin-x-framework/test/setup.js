// This file will be automatically loaded by Vitest before running tests
import '@testing-library/jest-dom';
import {server} from '../src/test/msw/node';

// Establish API mocking before all tests
beforeAll(function () {
    server.listen();
});

// Reset any runtime request handlers we may add during the tests
afterEach(function () {
    server.resetHandlers();
});

// Clean up after the tests are finished
afterAll(function () {
    server.close();
}); 