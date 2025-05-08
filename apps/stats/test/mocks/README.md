# Test Mocks

This directory contains centralized mock implementations that can be reused across tests.

## Usage

### React Mocks

The React mocks simplify testing components that use React hooks like `useMemo`. Import and call the setup function at the top of your test file:

```typescript
import {setupReactMocks} from '../../../test/mocks/react';

// Setup mocks before tests
setupReactMocks();
```

### API Hook Mocks

The API hook mocks provide factories for mocking Ghost Admin X Framework API hooks:

```typescript
import {setupAdminXStatsMocks, setupGrowthStatsMocks} from '../../../test/mocks/api-hooks';

// With default simple return values
setupAdminXStatsMocks();

// With custom return values
setupAdminXStatsMocks({
  newsletterStats: {
    isLoading: false, 
    data: [{id: '1', subject: 'Test'}]
  }
});

// Setup Growth Stats mocks with custom getRangeDates implementation
setupGrowthStatsMocks((range) => {
  if (range === 7) {
    return {
      dateFrom: '2023-01-01', 
      endDate: '2023-01-07'
    };
  }
  // Default case
  return {
    dateFrom: '2023-01-01',
    endDate: '2023-01-30'
  };
});
```

### UI Component Mocks

The UI component mocks provide test implementations for Shade and Stats Layout components:

```typescript
import {setupShadeMocks, setupStatsLayoutMocks} from '../../../test/mocks/ui-components';

// Setup UI component mocks
setupShadeMocks();
setupStatsLayoutMocks();
```

## Implementation

Each mock function handles setting up the necessary `vi.mock` calls for you, with sensible defaults that can be overridden as needed. This approach:

1. **Reduces duplication** across test files
2. **Standardizes** mock implementations
3. **Simplifies** test setup
4. **Centralizes** implementation details

## Best Practices

1. Import and setup mocks at the top of test files
2. Customize as needed for specific test cases
3. Use `vi.resetAllMocks()` in `beforeEach` to ensure clean tests
4. For complex mocks, create your own implementation in the test file 