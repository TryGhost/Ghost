import {setupServer} from 'msw/node';

// This file contains the MSW setup for Node.js environments

// Export the server instance to be used in Node.js tests
export const server = setupServer(); 