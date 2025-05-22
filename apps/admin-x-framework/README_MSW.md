# MSW (Mock Service Worker) Implementation

This document explains how Ghost's admin-x-framework uses MSW for API mocking in tests.

## Overview

MSW (Mock Service Worker) is a testing library that intercepts network requests and provides mock responses. It allows testing API interactions without making actual network calls.

## Setup

### Installation

MSW is already installed as a dev dependency in `package.json`:
```
"msw": "^2.8.4"
```

### Server Initialization

MSW requires proper server initialization before tests run:

```typescript
// Set up MSW server for all tests
beforeAll(() => server.listen());
afterAll(() => server.close());
afterEach(() => server.resetHandlers());
```

## Common Issues

### Connection Errors (ECONNREFUSED)

When you see errors like:
```
NetworkError: AggregateError [ECONNREFUSED]
```

Causes:
- Server not properly initialized before tests run
- Port conflicts
- Missing initialization in test setup

### Missing Request Handlers

When you see warnings like:
```
[MSW] Warning: intercepted a request without a matching request handler:
• POST /ghost/api/admin/test/
```

Causes:
- Request made without a corresponding handler
- Incorrect URL path in handler
- Method mismatch (GET vs POST)

## Best Practices

1. **Define handlers for every request** in your tests
2. **Reset handlers after each test** to prevent leakage
3. **Check handler paths and methods** match exactly
4. **Always initialize the server** in beforeAll/afterAll hooks

## API Reference

### Direct Handler Creation

```typescript
server.use(
    http.get('/ghost/api/admin/test', () => {
        return Response.json({message: 'Hello from MSW!'});
    })
);
```

### Helper Functions

```typescript
// Helper for GET requests
server.use(
    get('/ghost/api/admin/test', {message: 'Hello from helper!'})
);
```

### Request Configuration

```typescript
const mockRequests = {
    getTest: {
        method: 'GET', 
        path: '/test', 
        response: {message: 'Hello from request config!'}
    }
};

server.use(...createHandlersFromConfig(mockRequests));
```

## Usage with Playwright

For Playwright tests, use the `playwrightServer` instance and `mockApi` helper:

```typescript
// Set up MSW server for all tests
test.beforeAll(() => {
    playwrightServer.listen();
});

test.afterAll(() => {
    playwrightServer.close();
});

test.afterEach(() => {
    playwrightServer.resetHandlers();
});

test('example test', async ({page}) => {
    await mockApi({page, requests: {
        getTest: {method: 'GET', path: '/test/', response: {data: 'test'}}
    }});
    
    // Rest of your test...
});
```

## Troubleshooting

If you encounter issues:

1. Verify server is properly initialized in test setup
2. Ensure request paths in handlers match exactly (including trailing slashes)
3. Check that handler methods match request methods
4. Confirm server is reset between tests
5. For Playwright, ensure browser context is properly configured

See the example tests in `msw-example.test.tsx` for reference implementations. 