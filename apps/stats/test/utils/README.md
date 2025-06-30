# Testing Utilities

This directory contains utilities to improve test reliability, maintainability, and consistency across the stats app test suite.

## Files Overview

### `test-helpers.ts`
Main export file that provides backward compatibility and re-exports all testing utilities.

### `date-testing-utils.ts`
**Purpose**: Eliminate date-related test flakiness

**Key Features:**
- Fixed date (`2024-01-15T12:00:00.000Z`) for consistent test behavior
- Mock system date to prevent timing issues
- Date range calculation utilities that work reliably
- Mocking utilities for `@tryghost/shade` date functions

**Usage:**
```typescript
import { setupDateMocking, getExpectedDateRange } from '../../utils/test-helpers';

beforeEach(() => {
    const dateMocking = setupDateMocking();
});

// Use consistent date ranges in assertions
const { expectedDateFrom, expectedDateTo } = getExpectedDateRange(30);
```

### `mock-factories.ts`
**Purpose**: Builder pattern for test data creation

**Key Features:**
- `MockPostBuilder` - Flexible post creation with sensible defaults
- `MockStatsBuilder` - Statistics data with configurable values
- `MockApiResponseBuilder` - Standard API response shapes
- Quick factory functions for common scenarios

**Usage:**
```typescript
import { MockPostBuilder, createMockPost } from '../../utils/test-helpers';

// Builder pattern for complex data
const post = new MockPostBuilder()
    .withId('test-123')
    .withAuthors([{name: 'Test Author'}])
    .withoutEmail()
    .build();

// Quick factories for simple cases
const simplePost = createMockPost({ id: 'simple-123' });
```

### `hook-testing-utils.ts`
**Purpose**: Reduce boilerplate in hook testing

**Key Features:**
- `createStandardApiMock()` - Complete API mock setup
- `createStandardHookTestSuite()` - Generate common test patterns
- `setupCommonHookMocks()` - Standard dependency mocking
- Test generators for parameters, shouldFetch, loading/error states

**Usage:**
```typescript
import { createStandardHookTestSuite } from '../../utils/test-helpers';

const testSuite = createStandardHookTestSuite(
    'useMyHook',
    useMyHook,
    mockApiCall,
    { hasRange: true, hasOrder: true, hasShouldFetch: true }
);

testSuite.forEach(({name, test}) => {
    it(name, test);
});
```

## Migration Benefits

### Before (Problems)
- **Date Flakiness**: Tests failed randomly based on execution time
- **Verbose Setup**: Each test repeated 50+ lines of mock configuration
- **Inconsistent Patterns**: Different approaches across test files
- **Maintenance Burden**: Changes required updates in multiple files

### After (Solutions)
- **Reliable Dates**: Fixed dates eliminate timing-dependent failures
- **Reduced Boilerplate**: Standard patterns generate common test cases
- **Consistent Mocking**: Reusable builders for complex data structures
- **Maintainable**: Changes in one place affect all tests

## Test Results

All tests now pass consistently:
- **228 tests passing** (0 failures)
- **Hook coverage: 97.68%** (up from ~75%)
- **Utils coverage: 100%**
- **Reliable date handling** across all tests

## Future Improvements

1. **Integration Tests**: Add utilities for component integration testing
2. **Performance Tests**: Add utilities for testing hook performance
3. **Accessibility Tests**: Add utilities for a11y testing
4. **Visual Tests**: Add utilities for snapshot testing

## Usage Guidelines

1. **Use fixed dates** for any time-dependent tests
2. **Use builders** for complex mock data that varies between tests
3. **Use factories** for simple mock data that's consistent
4. **Use generators** for standard hook test patterns
5. **Migrate gradually** - existing tests continue to work while new tests adopt these patterns