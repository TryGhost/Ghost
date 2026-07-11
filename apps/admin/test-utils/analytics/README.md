# Analytics Testing Utilities

This directory contains utilities to improve test reliability and consistency across the analytics test suite.

## Files Overview

### `test-helpers.ts`
Provides `setupStatsAppMocks()`, a universal mock setup for stats hooks. It returns
pre-configured mock functions for the stats API hooks and the analytics context,
seeded with the centralized `responseFixtures` from `@tryghost/admin-x-framework/test/acceptance`.

**Usage:**
```typescript
import { setupStatsAppMocks } from '@test-utils/analytics/test-helpers';

beforeEach(() => {
    const mocks = setupStatsAppMocks();
});
```

### `date-testing-utils.ts`
**Purpose**: Eliminate date-related test flakiness

**Key Features:**
- Fixed date (`2024-01-15T12:00:00.000Z`) for consistent test behavior
- Mock system date to prevent timing issues
- Date range calculation utilities that work reliably

**Usage:**
```typescript
import { setupDateMocking, getExpectedDateRange } from '@test-utils/analytics/date-testing-utils';

beforeEach(() => {
    const dateMocking = setupDateMocking();
});

// Use consistent date ranges in assertions
const { expectedDateFrom, expectedDateTo } = getExpectedDateRange(30);
```

## Usage Guidelines

1. **Use fixed dates** for any time-dependent tests
2. **Use `setupStatsAppMocks`** when a test needs the standard stats hook mocks
3. For generic API hook mocking (`mockApiHook`, `mockSuccess`, `mockLoading`, ...),
   import from `@tryghost/admin-x-framework/test/hook-testing-utils`
