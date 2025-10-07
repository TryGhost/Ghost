# Testing Guide

This guide covers Ghost's testing infrastructure, how to run tests, write new tests, and debug test failures.

## Table of Contents

- [Overview](#overview)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Utilities](#test-utilities)
- [Browser Testing](#browser-testing)
- [Debugging Tests](#debugging-tests)
- [CI/CD Testing](#cicd-testing)
- [Code Coverage](#code-coverage)

## Overview

Ghost uses a comprehensive testing strategy with multiple test types:

- **Unit Tests**: Test individual functions and classes in isolation
- **Integration Tests**: Test API endpoints and service interactions
- **E2E Tests**: Test complete user flows and system behavior
- **Browser Tests**: Test UI interactions using Playwright

### Testing Stack

- **Test Runner**: [Mocha](https://mochajs.org/)
- **Assertion Library**: Built-in Node.js assertions + custom helpers
- **Browser Testing**: [Playwright](https://playwright.dev/)
- **Coverage**: [c8](https://github.com/bcoe/c8) (Istanbul)
- **Mocking**: Sinon.js (built into test utilities)

## Test Types

### Unit Tests

**Location**: `ghost/core/test/unit/`

Test individual functions, classes, or modules in complete isolation.

**Characteristics**:
- ⚡ Fast (< 2s timeout)
- 🔒 No database required
- 🎭 Heavy mocking of dependencies
- 📦 Tests single units of code

**Example**:
```javascript
// test/unit/server/services/url/UrlGenerator.test.js
describe('UrlGenerator', function () {
    it('should generate post URLs correctly', function () {
        const generator = new UrlGenerator({...});
        const url = generator.getUrl({slug: 'my-post'});
        assert.equal(url, '/my-post/');
    });
});
```

### Integration Tests

**Location**: `ghost/core/test/integration/`

Test how multiple components work together, typically testing API endpoints.

**Characteristics**:
- 🗄️ Uses real test database
- 🌐 Tests API endpoints
- ⏱️ Moderate speed (< 10s timeout)
- 🔗 Tests component interactions

**Example**:
```javascript
// test/integration/api/posts.test.js
describe('Posts API', function () {
    it('can create a post', async function () {
        const res = await request.post('/ghost/api/admin/posts/')
            .send({posts: [{title: 'Test Post'}]})
            .expect(201);

        assert.equal(res.body.posts[0].title, 'Test Post');
    });
});
```

### End-to-End (E2E) Tests

**Location**: `ghost/core/test/e2e-*/` and `e2e/`

Test complete user workflows from start to finish.

**Characteristics**:
- 🌍 Full system testing
- 🗄️ Real database interactions
- 📧 Tests email sending, webhooks, etc.
- ⏰ Slower (< 15s timeout)

**Example**:
```javascript
// test/e2e-api/admin/members.test.js
describe('Member Signup Flow', function () {
    it('can signup and receive welcome email', async function () {
        // Create member
        await request.post('/members/api/send-magic-link/')
            .send({email: 'test@example.com'});

        // Verify email was sent
        const email = await getLastEmail();
        assert(email.to.includes('test@example.com'));
    });
});
```

### Browser Tests (Playwright)

**Location**: `ghost/core/test/e2e-browser/`

Test UI interactions in real browsers.

**Characteristics**:
- 🖱️ Real browser automation
- 👁️ Visual regression testing
- 🌐 Tests JavaScript-heavy UIs
- 🐌 Slowest tests

**Example**:
```javascript
// test/e2e-browser/admin/posts.test.js
test('can create a post in admin', async ({page}) => {
    await page.goto('/ghost');
    await page.click('[data-test-nav="posts"]');
    await page.click('[data-test-button="new-post"]');
    await page.fill('[data-test-input="title"]', 'My Post');
    await page.click('[data-test-button="publish"]');

    await expect(page.locator('.gh-notification')).toContainText('Published');
});
```

## Running Tests

### All Tests

```bash
# Run all tests (unit + integration + e2e)
yarn test

# Run all tests in Ghost core only
cd ghost/core
yarn test:all
```

### Unit Tests

```bash
# All unit tests
yarn test:unit

# Specific test file
yarn test:single test/unit/server/services/url/UrlGenerator.test.js

# With debug output
yarn test:debug test/unit/...
```

### Integration Tests

```bash
# All integration tests
cd ghost/core
yarn test:integration

# Specific integration test
yarn test:single test/integration/api/posts.test.js
```

### E2E Tests

```bash
# All E2E tests
yarn test:e2e

# From root workspace
yarn test:e2e

# With debug logging
yarn test:e2e:debug
```

### Browser Tests

```bash
# All browser tests
cd ghost/core
yarn test:browser

# Admin tests only
yarn test:browser:admin

# Portal tests only
yarn test:browser:portal

# Install Playwright browsers (first time)
yarn test:browser:setup
```

### Running Tests in Docker

```bash
# Unit tests in Docker
yarn docker:test:unit

# E2E tests in Docker
yarn docker:test:e2e

# All tests in Docker
yarn docker:test:all
```

### Running Specific Tests

Use Mocha's `grep` flag to run specific tests:

```bash
# Run tests matching a pattern
yarn test:unit -- --grep "UrlGenerator"

# Run tests in a specific file
yarn test:single test/unit/server/services/url/UrlGenerator.test.js
```

### Running Tests by Speed

Identify slow tests for optimization:

```bash
# Show slowest unit tests
yarn test:unit:slow

# Show slowest integration tests
yarn test:int:slow

# Show slowest E2E tests
yarn test:e2e:slow
```

## Writing Tests

### Test File Structure

```javascript
const assert = require('assert/strict');
const {mockManager} = require('../utils/e2e-framework');

describe('Feature Name', function () {
    // Lifecycle hooks
    before(function () {
        // Run once before all tests
    });

    beforeEach(function () {
        // Run before each test
        mockManager.mockMail();
    });

    afterEach(function () {
        // Run after each test
        mockManager.restore();
    });

    after(function () {
        // Run once after all tests
    });

    // Test cases
    describe('Sub-feature', function () {
        it('should do something', function () {
            // Arrange
            const input = 'test';

            // Act
            const result = doSomething(input);

            // Assert
            assert.equal(result, 'expected');
        });

        it('should handle edge case', async function () {
            // Async test
            const result = await asyncFunction();
            assert.ok(result);
        });
    });
});
```

### Naming Conventions

- **File names**: `FeatureName.test.js` or `feature-name.test.js`
- **Describe blocks**: Use clear, hierarchical names
- **Test cases**: Start with "should" or describe the behavior

**Good examples**:
```javascript
describe('UrlGenerator', function () {
    describe('getUrl', function () {
        it('should generate absolute URLs when absolute is true');
        it('should generate relative URLs by default');
        it('should handle missing slugs gracefully');
    });
});
```

### Assertions

Ghost uses Node.js built-in `assert/strict`:

```javascript
const assert = require('assert/strict');

// Equality
assert.equal(actual, expected);
assert.deepEqual(obj1, obj2);
assert.strictEqual(actual, expected);

// Truthiness
assert.ok(value);
assert(!value);

// Exceptions
assert.throws(() => fn(), /error message/);
assert.doesNotThrow(() => fn());

// Async
await assert.rejects(asyncFn(), /error/);
await assert.doesNotReject(asyncFn());
```

## Test Utilities

### E2E Framework

Located in `test/utils/e2e-framework/`, provides utilities for E2E testing:

```javascript
const {
    agentProvider,
    mockManager,
    fixtureManager,
    matchers
} = require('../utils/e2e-framework');

// Create authenticated agent
const agent = await agentProvider.getAdminAPIAgent();

// Make API requests
const res = await agent.post('/posts/')
    .body({posts: [{title: 'Test'}]})
    .expectStatus(201);

// Mock email
mockManager.mockMail();

// Load fixtures
await fixtureManager.init('posts', 'members');

// Use snapshot matchers
assert.equal(res.body, matchers.anyObjectId);
```

### Fixtures

Fixtures provide test data:

```javascript
const {fixtureManager} = require('../utils/e2e-framework');

// Load specific fixtures
await fixtureManager.init('posts', 'users', 'members');

// Get fixture data
const post = fixtureManager.get('posts', 0);
```

### Mocking

```javascript
const {mockManager} = require('../utils/e2e-framework');

// Mock email service
mockManager.mockMail();

// Mock Stripe
mockManager.mockStripe();

// Mock webhooks
mockManager.mockWebhook();

// Restore all mocks
mockManager.restore();
```

### Database Management

```javascript
const {getDbInfo, setupDb, teardownDb} = require('../utils/e2e-utils');

before(async function () {
    await setupDb();
});

after(async function () {
    await teardownDb();
});
```

## Browser Testing

### Playwright Configuration

Configuration in `ghost/core/playwright.config.js`:

```javascript
module.exports = {
    testDir: './test/e2e-browser',
    timeout: 30000,
    projects: [
        {name: 'admin', testMatch: /admin\/.*.test.js/},
        {name: 'portal', testMatch: /portal\/.*.test.js/}
    ]
};
```

### Writing Browser Tests

```javascript
const {test, expect} = require('@playwright/test');

test.describe('Admin Login', () => {
    test('can login with valid credentials', async ({page}) => {
        await page.goto('/ghost');

        await page.fill('[name="identification"]', 'user@example.com');
        await page.fill('[name="password"]', 'password');
        await page.click('[data-test-button="sign-in"]');

        await expect(page).toHaveURL(/\/ghost\/#\/dashboard/);
    });
});
```

### Page Object Pattern

Ghost uses the **Page Object Pattern** for browser tests (see [ADR-0002](../adr/0002-page-objects-pattern.md)):

```javascript
class PostsPage {
    constructor(page) {
        this.page = page;
    }

    async goto() {
        await this.page.goto('/ghost/#/posts');
    }

    async createPost(title) {
        await this.page.click('[data-test-button="new-post"]');
        await this.page.fill('[data-test-input="title"]', title);
        return new PostEditorPage(this.page);
    }
}

// Usage in test
test('can create post', async ({page}) => {
    const postsPage = new PostsPage(page);
    await postsPage.goto();
    await postsPage.createPost('My Post');
});
```

## Debugging Tests

### Debug Logging

```bash
# Enable debug logs for specific namespace
DEBUG=ghost:test* yarn test:unit

# Debug specific services
DEBUG=ghost:services:members yarn test:integration

# Debug all Ghost namespaces
DEBUG=ghost:* yarn test
```

### Running Single Tests

```bash
# Run one test file
yarn test:single test/unit/path/to/test.js

# Run tests matching pattern
yarn test:unit -- --grep "specific test name"
```

### Debugging in VS Code

Add to `.vscode/launch.json`:

```json
{
    "type": "node",
    "request": "launch",
    "name": "Mocha Tests",
    "program": "${workspaceFolder}/node_modules/mocha/bin/_mocha",
    "args": [
        "--require", "tsx",
        "--timeout", "999999",
        "${file}"
    ],
    "console": "integratedTerminal"
}
```

### Browser Test Debugging

```bash
# Run with headed browser (visible)
yarn test:browser -- --headed

# Run in debug mode
yarn test:browser -- --debug

# Generate trace
yarn test:browser -- --trace on
```

### Common Issues

#### Timeout Errors
```javascript
// Increase timeout for slow tests
it('slow test', async function () {
    this.timeout(10000); // 10 seconds
    // ...
});
```

#### Database State Issues
```javascript
// Ensure clean state
beforeEach(async function () {
    await clearDatabase();
    await loadFixtures();
});
```

#### Flaky Tests
- Use proper wait conditions in browser tests
- Avoid `sleep()` or hardcoded delays
- Use deterministic test data
- Mock external services

## CI/CD Testing

### GitHub Actions

Tests run automatically on pull requests via GitHub Actions (`.github/workflows/`).

### CI-specific Test Commands

```bash
# CI unit tests (with coverage)
yarn test:ci:unit

# CI integration tests (with coverage)
yarn test:ci:integration

# CI E2E tests (with coverage)
yarn test:ci:e2e
```

### Coverage Requirements

Defined in `ghost/core/.c8rc.json`:

```json
{
    "lines": 52,
    "functions": 47,
    "branches": 73,
    "statements": 52
}
```

## Code Coverage

### Generating Coverage

```bash
# Run tests with coverage
yarn test:unit  # Automatically includes coverage

# View coverage report
open ghost/core/coverage/index.html
```

### Coverage Reports

Coverage reports are generated in:
- `ghost/core/coverage/` - Unit test coverage
- `ghost/core/coverage-integration/` - Integration test coverage
- `ghost/core/coverage-e2e/` - E2E test coverage

### Improving Coverage

1. Identify uncovered code in coverage reports
2. Add tests for uncovered branches
3. Focus on critical paths first
4. Don't aim for 100% - focus on meaningful coverage

## Best Practices

### Do's ✅

- **Write tests for bug fixes** - Prevents regressions
- **Keep tests focused** - One behavior per test
- **Use descriptive names** - Tests serve as documentation
- **Clean up after tests** - Restore mocks, clear state
- **Test edge cases** - Null, undefined, empty values
- **Use fixtures** - Avoid hardcoded test data
- **Mock external services** - Email, Stripe, webhooks

### Don'ts ❌

- **Don't write flaky tests** - Tests should be deterministic
- **Don't test implementation details** - Test behavior, not internals
- **Don't share state between tests** - Each test should be independent
- **Don't use hardcoded delays** - Use proper wait conditions
- **Don't skip failing tests** - Fix or remove them
- **Don't test third-party libraries** - Trust they work

### Test Smells

Watch out for:
- ⏰ Tests that timeout inconsistently
- 🔄 Tests that depend on execution order
- 🎲 Tests with random failures
- 📦 Tests that are too complex
- 🐌 Slow tests that could be faster
- 🔁 Duplicated test code

## Additional Resources

- [Mocha Documentation](https://mochajs.org/)
- [Playwright Documentation](https://playwright.dev/)
- [ADR-0001: Test Structure](../adr/0001-aaa-test-structure.md)
- [ADR-0002: Page Objects Pattern](../adr/0002-page-objects-pattern.md)
- [Node.js Assert Documentation](https://nodejs.org/api/assert.html)

## Next Steps

- [Development Guide](./DEVELOPMENT.md) - Development workflow
- [Architecture](./ARCHITECTURE.md) - Understanding the codebase
- [Contributing Guide](../.github/CONTRIBUTING.md) - Contribution guidelines
