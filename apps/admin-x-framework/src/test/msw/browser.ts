import {setupWorker} from 'msw/browser';

// This file contains the MSW setup for browser environments

// Export the worker instance to be used in browser tests
export const worker = setupWorker(); 