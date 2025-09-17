# Mirage JS Usage Guide for Ghost Portal

This guide shows how to use the new Mirage JS setup for testing in the Ghost Portal application.

## Quick Start

Mirage JS is now automatically set up for all tests. When you write tests, you have access to a pre-configured `server` instance that can create realistic test data.

## Basic Usage

### Creating Simple Data

```javascript
import { describe, test, expect } from 'vitest';
import { server } from '../mirage/test-setup'; // Available globally

test('create a site', () => {
    const site = server.create('site');
    expect(site.title).toBe('The Blueprint');
});

test('create a member', () => {
    const member = server.create('member');
    expect(member.name).toBe('Jamie Larson');
    expect(member.email).toBe('jamie@example.com');
});
```

### Using Traits for Variations

Traits allow you to create different variations of the same model:

```javascript
test('create different types of members', () => {
    const freeMember = server.create('member', 'free');
    const paidMember = server.create('member', 'paid');
    const suppressedMember = server.create('member', 'suppressed');

    expect(freeMember.paid).toBe(false);
    expect(paidMember.paid).toBe(true);
    expect(suppressedMember.email_suppression.suppressed).toBe(true);
});

test('create different site configurations', () => {
    const siteWithoutName = server.create('site', 'withoutName');
    const paidOnlySite = server.create('site', 'paidMembersOnly');

    expect(siteWithoutName.portal_name).toBe(false);
    expect(paidOnlySite.members_signup_access).toBe('paid');
});
```

### Using Scenario Builders

For complex setups, use pre-built scenario builders:

```javascript
import { scenarios } from '../mirage/test-helpers';

test('single tier site with free member', () => {
    const { site, member, products } = scenarios.freeMemberSingleTier(server);

    expect(site.title).toBe('The Blueprint');
    expect(member.paid).toBe(false);
    expect(products).toHaveLength(2); // free + paid
});

test('multi-tier site setup', () => {
    const { site, member, products } = scenarios.freeMemberMultiTier(server);

    expect(products).toHaveLength(4); // free + 3 paid tiers
});
```

## Available Models and Traits

### Site Model
```javascript
server.create('site') // Basic site
server.create('site', 'singleTier') // Single tier configuration
server.create('site', 'multipleTiers') // Multiple tiers
server.create('site', 'withoutName') // portal_name: false
server.create('site', 'paidMembersOnly') // members_signup_access: 'paid'
server.create('site', 'stripeNotConfigured') // is_stripe_configured: false
```

### Member Model
```javascript
server.create('member') // Basic free member
server.create('member', 'free') // Explicitly free
server.create('member', 'paid') // Paid member with subscription
server.create('member', 'complimentary') // Complimentary member
server.create('member', 'suppressed') // Email suppressed member
server.create('member', 'altFree') // Alternative free member (different name/email)
```

### Product Model
```javascript
server.create('product') // Basic product
server.create('product', 'free') // Free tier
server.create('product', 'bronze') // Bronze tier ($7/month, $70/year)
server.create('product', 'silver') // Silver tier ($12/month, $120/year)
server.create('product', 'premium') // Premium tier ($180/month, $170/year)
```

### Other Models
```javascript
server.create('subscription') // Basic subscription
server.create('offer') // Basic offer
server.create('newsletter') // Basic newsletter
server.create('newsletter', 'daily') // Daily newsletter variant
```

## Available Scenarios

Import scenarios for complex test setups:

```javascript
import { scenarios, setupServerState } from '../mirage/test-helpers';

// Pre-built scenarios
scenarios.freeMemberSingleTier(server)
scenarios.freeMemberMultiTier(server)
scenarios.paidMemberSingleTier(server)
scenarios.paidMemberMultiTier(server)
scenarios.singleTierWithoutName(server)
scenarios.singleTierOnlyFreePlan(server)
scenarios.singleTierOnlyPaidPlan(server)
scenarios.multiTierOnlyFreePlan(server)
scenarios.multiTierOnlyPaidPlans(server)
scenarios.paidMembersOnly(server)
scenarios.stripeNotConfigured(server)
scenarios.offerScenario(server, offerId)
scenarios.suppressedMember(server)
scenarios.memberWithNewsletter(server)

// Using setupServerState
const { site, member } = setupServerState(server, 'freeMemberSingleTier');
```

## API Mocking

Mirage automatically mocks these API endpoints:

- `GET /members/api/site` - Returns site data
- `GET /members/api/member` - Returns member data
- `POST /members/api/send-magic-link` - Returns 'Success'
- `GET /members/api/integrity-token` - Returns 'testtoken'
- `POST /members/api/create-stripe-checkout-session` - Returns checkout session
- `GET /members/api/offers/:id` - Returns offer data
- `GET /members/api/session` - Returns identity token
- `DELETE /members/api/session` - Returns success

### Testing API Calls

```javascript
test('should handle API calls automatically', async () => {
    // Create test data
    const site = server.create('site', { title: 'Test Site' });

    // API calls work automatically
    const response = await fetch('/members/api/site');
    const data = await response.json();

    expect(data.title).toBe('Test Site');
});
```

## Migration Example

### OLD Pattern (Manual Jest Mocking)
```javascript
// ❌ Old way - lots of manual setup
const setup = async ({site, member = null}) => {
    const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});
    ghostApi.init = jest.fn(() => {
        return Promise.resolve({
            site: deepClone(site),
            member: member ? deepClone(member) : null
        });
    });
    ghostApi.member.sendMagicLink = jest.fn(() => Promise.resolve('success'));
    ghostApi.member.getIntegrityToken = jest.fn(() => Promise.resolve('testtoken'));
    ghostApi.member.checkoutPlan = jest.fn(() => Promise.resolve());
    // ... 50+ more lines of manual mocking
};
```

### NEW Pattern (Mirage Scenarios)
```javascript
// ✅ New way - clean and simple
test('signup flow', () => {
    const { site, member } = scenarios.freeMemberSingleTier(server);

    // All API endpoints work automatically
    // No manual mocking needed
    // Data is realistic and dynamic
});
```

## Best Practices

### 1. Use Scenarios for Integration Tests
```javascript
// ✅ Good - use scenarios for complex setups
test('signup flow for paid member', () => {
    const { site, member, products } = scenarios.freeMemberSingleTier(server);
    // Test your component/flow
});
```

### 2. Use Individual Models for Unit Tests
```javascript
// ✅ Good - create only what you need for unit tests
test('MemberCard component', () => {
    const member = server.create('member', 'paid');
    // Test component with specific member
});
```

### 3. Clean Server State is Automatic
```javascript
// ✅ No need to manually clean up
// Mirage automatically resets between tests
```

### 4. Combine Traits for Specific Scenarios
```javascript
// ✅ Good - combine traits for specific needs
test('paid member on invite-only site', () => {
    const site = server.create('site', 'membersInviteOnly');
    const member = server.create('member', 'paid');
    // Test scenario
});
```

## Debugging Tips

### View Created Data
```javascript
test('debug server state', () => {
    const site = server.create('site');
    console.log('Site data:', site.attrs);
    console.log('All sites:', server.db.sites);
});
```

### Check Relationships
```javascript
test('debug relationships', () => {
    const { site, products } = scenarios.freeMemberSingleTier(server);
    console.log('Site products:', site.products.models);
    console.log('First product site:', products[0].site.attrs);
});
```

## Common Patterns

### Testing Different Member States
```javascript
describe('Member scenarios', () => {
    test('free member', () => {
        const member = server.create('member', 'free');
        // Test free member behavior
    });

    test('paid member', () => {
        const member = server.create('member', 'paid');
        // Test paid member behavior
    });

    test('suppressed member', () => {
        const member = server.create('member', 'suppressed');
        // Test suppressed member behavior
    });
});
```

### Testing Site Configurations
```javascript
describe('Site configurations', () => {
    test('single tier site', () => {
        const { site, products } = scenarios.freeMemberSingleTier(server);
        expect(products).toHaveLength(2);
    });

    test('multi tier site', () => {
        const { site, products } = scenarios.freeMemberMultiTier(server);
        expect(products).toHaveLength(4);
    });

    test('paid members only', () => {
        const { site } = scenarios.paidMembersOnly(server);
        expect(site.members_signup_access).toBe('paid');
    });
});
```

## Next Steps

1. Existing tests continue to work unchanged
2. New tests can use either pattern
3. Gradually migrate tests to use Mirage scenarios
4. Refer to `src/mirage/demo.test.js` for more examples

This approach significantly reduces test boilerplate while making tests more maintainable and realistic.