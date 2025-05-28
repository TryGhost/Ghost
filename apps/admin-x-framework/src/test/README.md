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

### Performance Testing

```typescript
import {measureRenderTime} from '@tryghost/admin-x-framework/test/test-utils';

const {result, renderTime} = measureRenderTime(() => {
    return renderWithProviders(<ExpensiveComponent />);
});

expect(renderTime).toBeLessThan(100); // Assert performance
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

## API Mocking

### Basic API Mocking

```typescript
import {mockApi, createMockRequests} from '@tryghost/admin-x-framework/test/acceptance';

// Basic usage - covers most common endpoints
await mockApi({page, requests: createMockRequests()});

// Override specific endpoints
await mockApi({page, requests: createMockRequests({
    browseMemberCountHistory: {
        method: 'GET', 
        path: /^\/stats\/member_count\//, 
        response: customMemberData
    }
})});
```

### Available Mock Endpoints

The `createMockRequests()` function provides mocks for:

**Global Data:**
- Settings, configuration, site data
- User authentication and roles
- Newsletters and invites

**Stats Endpoints:**
- Member count history (`/stats/member_count/`)
- Monthly recurring revenue (`/stats/mrr/`)
- Newsletter statistics (`/stats/newsletter-stats/`)
- Top posts (`/stats/top-posts/`)
- Post referrers (`/stats/posts/{id}/top-referrers`)
- Link tracking (`/links/`)

**Posts Endpoints:**
- Post data and metadata
- Link management

## Best Practices

### 1. Use Centralized Configuration
```typescript
// ✅ Good - Use shared config
export default createVitestConfig();

// ❌ Avoid - Duplicating configuration
export default defineConfig({...});
```

### 2. Leverage Test Utilities
```typescript
// ✅ Good - Use provided utilities
import {renderWithProviders, testDataFactories} from '@tryghost/admin-x-framework/test/test-utils';

// ❌ Avoid - Manual setup
const queryClient = new QueryClient({...});
```

### 3. Consistent Test Data
```typescript
// ✅ Good - Use factories
const post = testDataFactories.post({title: 'Custom Title'});

// ❌ Avoid - Inline objects
const post = {id: '1', title: 'Custom Title', ...};
```

### 4. Proper Cleanup
```typescript
// ✅ Good - Use provided cleanup
import {setupShadeMocks} from '@tryghost/admin-x-framework/test/setup';

// ❌ Avoid - Manual cleanup management
afterEach(() => { /* manual cleanup */ });
``` 