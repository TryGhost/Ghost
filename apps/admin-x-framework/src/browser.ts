// This file exports testing utilities for MSW that can be used in browser-based tests
// Import this instead of test.ts when running in a browser environment

import {HttpResponse, http} from 'msw';
import {QueryClientProvider} from '@tanstack/react-query';
import {limitRequests, responseFixtures} from './test/acceptance';
import {worker} from './test/msw/browser';
import {createMswHandlers, createTestQueryClient} from './test';

// Export everything needed for browser testing
export {
    HttpResponse,
    http,
    worker,
    responseFixtures,
    limitRequests,
    QueryClientProvider,
    createMswHandlers,
    createTestQueryClient
}; 