# E2E Database Management

## Overview

This directory contains examples and utilities for managing database state in E2E tests. The key challenge is coordinating database resets when running tests against a MySQL container, ensuring tests have clean state when needed while maintaining good performance.

## Available Utilities

### Database Reset
```typescript
import {resetDatabase} from '@tryghost/e2e';

// Reset database to initial state with fixtures
await resetDatabase(request);
```

**Important:** This clears ALL data including user authentication. You'll need to re-authenticate after reset.

### Ghost Restart
```typescript
import {restartGhost, waitForGhostRestart} from '@tryghost/e2e';

// Restart Ghost server
await restartGhost(request);
await waitForGhostRestart(request);
```

### Full Reset
```typescript
import {fullReset} from '@tryghost/e2e';

// Complete reset: database + restart
await fullReset(request);
```

## Security

These endpoints are protected by multiple layers:

1. **Environment Check**: Only work when `server:testmode` is enabled
2. **Authentication**: Require valid Ghost authentication
3. **Optional Token**: Can require `X-Test-Reset-Token` header
4. **404 Response**: Return 404 (not 403) when unauthorized to hide existence

## Setup

### 1. Enable Test Mode

Ghost must be running with test mode enabled:

```javascript
// In your Ghost config
{
  "server": {
    "testmode": true
  }
}
```

### 2. Optional: Configure Reset Token

For additional security, configure a reset token:

```javascript
{
  "testing": {
    "resetToken": "your-secret-token"
  }
}
```

Then use it in tests:
```typescript
await resetDatabase(request, {
  resetToken: process.env.TEST_RESET_TOKEN
});
```

## Usage Patterns

### Pattern 1: Reset Per Suite
Best for related tests that can share data.

```typescript
test.describe('Feature tests', () => {
  test.beforeAll(async ({request}) => {
    await resetDatabase(request);
  });
  
  // Tests share the same database state
});
```

### Pattern 2: Reset Per Test
Best for tests needing complete isolation.

```typescript
test.beforeEach(async ({request, page}) => {
  await resetDatabase(request);
  await reAuthenticate(page);
});
```

### Pattern 3: No Reset
Best for read-only tests or when testing data accumulation.

```typescript
// Just run tests against existing data
```

## Authentication Handling

Database reset clears user data. Handle re-authentication:

```typescript
import {reAuthenticate} from '@tryghost/e2e';

// After database reset
await reAuthenticate(page);
```

Or run the auth setup again:
```bash
npx playwright test auth.setup.ts
```

## Parallel Testing

When running tests in parallel with multiple Ghost instances:

1. Each worker gets its own Ghost container
2. Database resets are isolated per container
3. No coordination needed between workers
4. Container assignment handled by test infrastructure

## Performance Considerations

- **Database reset**: ~1-2 seconds with MySQL
- **Ghost restart**: ~5-10 seconds
- **Full reset**: ~10-15 seconds

Choose the minimal reset needed for your test requirements.

## Troubleshooting

### "Database reset endpoint not available"
- Ensure Ghost is running with `server:testmode: true`
- Check that you're authenticated

### "Authentication state has been cleared"
- Expected after database reset
- Run `reAuthenticate()` or auth setup

### "Ghost did not restart within X seconds"
- Increase timeout in `waitForGhostRestart()`
- Check Ghost logs for startup errors

## Future Enhancements

- [ ] Selective table reset (reset only specific tables)
- [ ] Database snapshots for faster restore
- [ ] Parallel container coordination
- [ ] Test data factories with automatic cleanup