# Testing with Admin-X-Framework

## Vitest Configuration

The admin-x-framework provides a shared vitest configuration factory to reduce duplication across apps while allowing customization.

### Basic Usage

```typescript
// vitest.config.ts
import {createVitestConfig} from '@tryghost/admin-x-framework/test/vitest-config';

export default createVitestConfig();
```

This provides sensible defaults:
- **React support** with `@vitejs/plugin-react`
- **jsdom environment** for DOM testing
- **Global test APIs** (describe, it, expect, etc.)
- **Standard aliases** (`@src`, `@test`)
- **Setup file** at `./test/setup.ts`
- **Coverage reporting** with text and HTML output
- **Common exclusions** (node_modules, test files, config files)

### Customization Options

```typescript
export default createVitestConfig({
    include: ['./test/unit/**/*.{test,spec}.{js,ts,jsx,tsx}'], // Custom test patterns
    aliases: {
        '@components': './src/components',
        '@utils': './src/utils'
    },
    silent: false,
    reporter: 'basic',
    setupFiles: ['./test/setup.ts', './test/custom-setup.ts']
});
```

## Test Setup for Shade Components

The admin-x-framework provides shared test setup utilities for apps using shade components. These utilities handle common mocks required for responsive behavior and chart components.

### Setting Up Your Test Environment

In your app's test setup file (e.g., `test/setup.ts`), import and call the shared setup functions:

```typescript
import '@testing-library/jest-dom';
import {setupShadeMocks, setupConsoleFilters} from '@tryghost/admin-x-framework/test/setup';

// Set up common mocks for shade components
setupShadeMocks();

// Set up console filtering for common warnings (optional)
setupConsoleFilters();
```

### Available Setup Functions

#### `setupShadeMocks()`
Automatically provides mocks for:
- **`window.matchMedia`** - Required for responsive behavior in shade components
- **`ResizeObserver`** - Required for charts and responsive components  
- **`Element.prototype.getBoundingClientRect`** - Required for positioning calculations

#### `setupConsoleFilters()`
Filters out common warnings that can't be fixed:
- React defaultProps warnings from third-party libraries
- Chart dimension warnings in headless environments
- Duplicate key warnings from table components

## MSW API Mocking

The admin-x-framework provides comprehensive MSW (Mock Service Worker) utilities for consistent API mocking across all Ghost apps.

### Basic Setup

```typescript
import {setupMswServer} from '@tryghost/admin-x-framework/test/msw-utils';

// Set up MSW server with all common Ghost API handlers
const server = setupMswServer();

describe('My Component', () => {
    // Server lifecycle is automatically managed
    // beforeAll, afterEach, afterAll are handled for you
    
    it('loads data from API', async () => {
        // Common endpoints like /config/, /settings/, /users/me/ are already mocked
        // Your test just works!
    });
});
```

### Available Fixtures

The framework provides realistic fixtures for common Ghost API endpoints:

```typescript
import {fixtures} from '@tryghost/admin-x-framework/test/msw-utils';

// Global data
fixtures.config      // Ghost configuration
fixtures.settings    // Site settings
fixtures.site        // Site information  
fixtures.user        // Current user data

// API-specific fixtures
fixtures.linksBulkSuccess     // Successful link bulk operation
fixtures.memberCountHistory  // Member count statistics
fixtures.mrrHistory          // Monthly recurring revenue data
```

### Overriding Specific Endpoints

```typescript
import {setupMswServer, createHandler, createErrorHandler} from '@tryghost/admin-x-framework/test/msw-utils';

const server = setupMswServer();

describe('Error Handling', () => {
    it('handles API errors gracefully', () => {
        // Override specific endpoint to return error
        server.use(
            createErrorHandler('put', '/ghost/api/admin/links/bulk/', 500)
        );
        
        // Test error handling...
    });
    
    it('handles custom responses', () => {
        // Override with custom response data
        server.use(
            createHandler('get', '/ghost/api/admin/posts/', {
                posts: [{id: '1', title: 'Custom Post'}],
                meta: {pagination: {total: 1}}
            })
        );
        
        // Test with custom data...
    });
});
```

### Request Validation

For thorough testing, you can validate request parameters and body:

```typescript
import {http, HttpResponse} from 'msw';

describe('API Request Validation', () => {
    it('sends correct request parameters and body', async () => {
        server.use(
            http.put('/ghost/api/admin/links/bulk/', async ({request}) => {
                const url = new URL(request.url);
                const body = await request.json();
                
                // Validate URL parameters
                expect(url.searchParams.get('filter')).toBe('post_id:\'123\'+to:\'https://example.com\'');
                
                // Validate request body
                expect(body).toEqual({
                    bulk: {
                        action: 'updateLink',
                        meta: {
                            link: {to: 'https://newurl.com'}
                        }
                    }
                });
                
                return HttpResponse.json({success: true});
            })
        );
        
        // Test your component/hook...
    });
});
```

### Advanced Usage

```typescript
import {createMswServer, handlers, fixtures} from '@tryghost/admin-x-framework/test/msw-utils';
import {http, HttpResponse} from 'msw';

// Create server with additional custom handlers
const server = createMswServer([
    // Add your own custom handlers
    http.get('/custom/endpoint/', () => {
        return HttpResponse.json({custom: 'data'});
    }),
    
    // Override default handlers
    http.get('/ghost/api/admin/config/', () => {
        return HttpResponse.json({
            ...fixtures.config,
            version: '6.x' // Custom version
        });
    })
]);
```

### Benefits

1. **Zero Setup**: Common Ghost API endpoints work out of the box
2. **Realistic Data**: Fixtures match actual Ghost API responses
3. **Easy Overrides**: Simple utilities for custom responses and errors
4. **Consistent**: Same mocking approach across all apps
5. **Type Safe**: Full TypeScript support

## Test Utilities

The framework provides comprehensive test utilities for consistent testing across apps.

### Component and Hook Testing

```typescript
import {renderWithProviders, renderHookWithProviders, createTestQueryClient} from '@tryghost/admin-x-framework/test/test-utils';

// Render components with all necessary providers
const {getByText} = renderWithProviders(<MyComponent />);

// Render hooks with providers
const {result} = renderHookWithProviders(() => useMyHook());

// Custom QueryClient for specific tests
const queryClient = createTestQueryClient();
renderWithProviders(<MyComponent />, {queryClient});

// Custom framework props
renderWithProviders(<MyComponent />, {
    frameworkProps: {
        ghostVersion: '4.x'
    }
});
```

### API Testing Utilities

```typescript
import {waitForApiCall, waitForApiCalls} from '@tryghost/admin-x-framework/test/test-utils';

// Wait for a single API call
await waitForApiCall(mockFetch);

// Wait for multiple API calls
await waitForApiCalls(mockFetch, 3);
```

### Test Data Factories

```typescript
import {testDataFactories} from '@tryghost/admin-x-framework/test/test-utils';

// Create test data with defaults
const post = testDataFactories.post();
const member = testDataFactories.member();
const user = testDataFactories.user();
const newsletter = testDataFactories.newsletter();

// Override specific properties
const publishedPost = testDataFactories.post({
    status: 'published',
    title: 'My Custom Title'
});
```

### Console Filtering

```typescript
import {setupConsoleFiltering} from '@tryghost/admin-x-framework/test/test-utils';

// Basic usage
const cleanup = setupConsoleFiltering();

// Custom filtering
const cleanup = setupConsoleFiltering({
    suppressReactWarnings: false,
    suppressChartWarnings: true,
    suppressMessages: ['Custom warning to suppress']
});

// Clean up when done
cleanup();
```

### Timer Mocking

```typescript
import {mockTimers} from '@tryghost/admin-x-framework/test/test-utils';

const timers = mockTimers();

// Advance time
timers.advanceTime(1000);

// Run all timers
timers.runAllTimers();

// Clean up
timers.cleanup();
```

## Best Practices

### 1. Use Path Aliases Instead of Relative Imports
```typescript
// ✅ Good - Use @src alias
import {useMyHook} from '@src/hooks/useMyHook';
import MyComponent from '@src/components/MyComponent';

// ❌ Avoid - Relative paths are harder to maintain
import {useMyHook} from '../../../src/hooks/useMyHook';
import MyComponent from '../../../src/components/MyComponent';
```

The vitest configuration automatically provides `@src` and `@test` aliases for cleaner imports.

**Important**: For path aliases to work in both tests and builds, you need to configure TypeScript path mapping in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@src/*": ["./src/*"],
      "@test/*": ["./test/*"]
    }
  }
}
```

### 2. Use Centralized Configuration
```typescript
// ✅ Good - Use shared config
export default createVitestConfig();

// ❌ Avoid - Duplicating configuration
export default defineConfig({...});
```

### 3. Leverage MSW for API Testing
```typescript
// ✅ Good - Use centralized MSW setup
const server = setupMswServer();

// ❌ Avoid - Manual MSW setup
const server = setupServer(/* manual handlers */);
```

### 4. Override Only When Needed
```typescript
// ✅ Good - Override specific endpoints
server.use(createErrorHandler('put', '/api/endpoint/', 500));

// ❌ Avoid - Recreating entire server setup
```

### 5. Proper Cleanup
```typescript
// ✅ Good - Use provided setup
const server = setupMswServer(); // Handles lifecycle automatically

// ❌ Avoid - Manual lifecycle management
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
``` 