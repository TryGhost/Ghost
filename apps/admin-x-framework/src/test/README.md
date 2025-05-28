# Testing with Admin-X-Framework

## API Mocking for Acceptance Tests

The admin-x-framework provides a centralized approach to mocking API endpoints for acceptance tests. All common endpoints are pre-configured with realistic fixture data.

### Basic Usage

```typescript
import {createMockRequests, mockApi} from '@tryghost/admin-x-framework/test/acceptance';
import {expect, test} from '@playwright/test';

test('loads with default data', async ({page}) => {
    // This includes mocks for all common endpoints:
    // - Global data (settings, config, site, user)
    // - Stats endpoints (member count, MRR, newsletter stats, etc.)
    // - Posts endpoints (posts, links)
    // - Limit requests (users, invites, roles, newsletters)
    await mockApi({page, requests: createMockRequests()});

    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
});
```

### Overriding Specific Responses

```typescript
test('can customize specific endpoints', async ({page}) => {
    const customMemberHistory = {
        stats: [
            {date: '2024-01-01', paid: 50, free: 100, comped: 5, paid_subscribed: 2, paid_canceled: 0}
        ],
        meta: {totals: {paid: 50, free: 100, comped: 5}}
    };

    await mockApi({page, requests: createMockRequests({
        browseMemberCountHistory: {
            method: 'GET', 
            path: /^\/stats\/member_count\//, 
            response: customMemberHistory
        }
    })});

    await page.goto('/');
    // Test with custom data...
});
```

### Available Mock Endpoints

The `defaultRequests` object includes mocks for:

#### Global Data
- `browseSettings` - Site settings
- `browseConfig` - Ghost configuration
- `browseSite` - Site information
- `browseMe` - Current user data

#### Stats Endpoints
- `browseMemberCountHistory` - Member count over time
- `browseMrrHistory` - Monthly recurring revenue history
- `browseNewsletterStats` - Newsletter performance stats
- `browseTopPosts` - Top performing posts
- `browsePostReferrers` - Post referrer data
- `browseLinks` - Link click tracking

#### Posts Endpoints
- `browsePost` - Individual post data
- `browseNewsletterStats` - Newsletter stats for posts
- `browseLinks` - Link data for posts

#### Limit Requests
- `browseUsers` - User list with pagination
- `browseInvites` - Pending invitations
- `browseRoles` - User roles
- `browseNewslettersLimit` - Newsletter list

### Unit Testing

For unit tests, focus on testing pure utility functions extracted from hooks:

```typescript
import {getRangeDates} from '../../../src/hooks/useGrowthStats';

describe('getRangeDates', () => {
    it('returns correct dates for specific range', () => {
        const {dateFrom, endDate} = getRangeDates(7);
        // Test the utility function...
    });
});
```

### Benefits

1. **No Duplication**: Apps don't need to maintain their own mock configurations
2. **Comprehensive Coverage**: All common endpoints are mocked by default
3. **Easy Overrides**: Simple to customize specific responses when needed
4. **Consistent Data**: All apps use the same realistic fixture data
5. **Maintainable**: Updates to fixtures benefit all apps automatically 