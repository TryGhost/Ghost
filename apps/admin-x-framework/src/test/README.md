# Testing with Admin-X-Framework

Legacy shared test utilities. Each module below only survives for the
consumers listed with it — check for remaining importers before extending
this surface, and prefer app-local fixtures (`apps/admin/test-utils/**`) plus
`@tryghost/test-data` builders for new tests. API mocking belongs to the
consuming app (Admin composes MSW via its `serverFixture`); this package no
longer ships MSW helpers or canned API fixtures.

## Modules

| Module                  | Exports                                                           | Consumers                               |
| ----------------------- | ----------------------------------------------------------------- | --------------------------------------- |
| `setup.ts`              | `setupShadeMocks`                                                 | Admin unit-test setup                   |
| `test-utils.tsx`        | `TestWrapper`, `renderHookWithProviders`, `createTestQueryClient` | This package's own unit tests           |
| `hook-testing-utils.ts` | `mockApiHook`, `mockLoading`, `mockSuccess`, ...                  | Admin analytics hook suites             |
| `acceptance.ts`         | `mockApi`                                                         | ActivityPub Playwright acceptance tests |
| `render.tsx`            | standalone render helper                                          | ActivityPub standalone entry            |

## Test Setup for Shade Components

In your app's test setup file (e.g. `test/setup.ts`):

```typescript
import '@testing-library/jest-dom';
import {setupShadeMocks} from '@tryghost/admin-x-framework/test/setup';

// Set up common mocks for shade components
setupShadeMocks();
```

`setupShadeMocks()` provides mocks for:

- **`window.matchMedia`** - Required for responsive behavior in shade components
- **`ResizeObserver`** - Required for charts and responsive components
- **`Element.prototype.getBoundingClientRect`** - Required for positioning calculations

## Component and Hook Testing

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

## Hook Mocking

`hook-testing-utils.ts` builds typed `UseQueryResult` mocks for vi-mocked API
hooks:

```typescript
import {mockSuccess, mockLoading, mockError} from '@tryghost/admin-x-framework/test/hook-testing-utils';

vi.mock('@tryghost/admin-x-framework/api/stats');
const mockUseTopPostsStats = vi.mocked(useTopPostsStats);

mockSuccess(mockUseTopPostsStats, {stats: [], meta: {}});
mockLoading(mockUseTopPostsStats);
mockError(mockUseTopPostsStats, new Error('boom'));
```
