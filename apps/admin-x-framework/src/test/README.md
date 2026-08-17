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
import {setupShadeMocks} from '@tryghost/admin-x-framework/test/setup';

// Set up common mocks for shade components
setupShadeMocks();
```

### Available Setup Functions

#### `setupShadeMocks()`
Automatically provides mocks for:
- **`window.matchMedia`** - Required for responsive behavior in shade components
- **`ResizeObserver`** - Required for charts and responsive components  
- **`Element.prototype.getBoundingClientRect`** - Required for positioning calculations

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

### Overriding Specific Endpoints

Use raw MSW handlers with `server.use()` to override responses per test:

```typescript
import {setupMswServer} from '@tryghost/admin-x-framework/test/msw-utils';
import {http, HttpResponse} from 'msw';

const server = setupMswServer();

describe('Error Handling', () => {
    it('handles API errors gracefully', () => {
        // Override specific endpoint to return error
        server.use(
            http.put('/ghost/api/admin/links/bulk/', () => new HttpResponse(null, {status: 500}))
        );
        
        // Test error handling...
    });
    
    it('handles custom responses', () => {
        // Override with custom response data
        server.use(
            http.get('/ghost/api/admin/posts/', () => HttpResponse.json({
                posts: [{id: '1', title: 'Custom Post'}],
                meta: {pagination: {total: 1}}
            }))
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
import {setupMswServer} from '@tryghost/admin-x-framework/test/msw-utils';
import {http, HttpResponse} from 'msw';

// Create server with additional custom handlers
const server = setupMswServer([
    // Add your own custom handlers
    http.get('/custom/endpoint/', () => {
        return HttpResponse.json({custom: 'data'});
    }),
    
    // Override default handlers
    http.get('/ghost/api/admin/config/', () => {
        return HttpResponse.json({version: '6.x'});
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

The framework provides test utilities for consistent testing across apps.

### Component and Hook Testing

```typescript
import {TestWrapper, renderHookWithProviders, createTestQueryClient} from '@tryghost/admin-x-framework/test/test-utils';

// Render hooks with providers
const {result} = renderHookWithProviders(() => useMyHook());

// Custom QueryClient for specific tests
const queryClient = createTestQueryClient();
renderHookWithProviders(() => useMyHook(), {queryClient});

// Custom framework props
renderHookWithProviders(() => useMyHook(), {
    frameworkProps: {
        ghostVersion: '4.x'
    }
});

// Wrap components with all necessary providers
render(<MyComponent />, {wrapper: TestWrapper});
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
server.use(http.put('/api/endpoint/', () => new HttpResponse(null, {status: 500})));

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