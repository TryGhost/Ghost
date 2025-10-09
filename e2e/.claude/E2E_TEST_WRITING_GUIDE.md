# E2E Test Writing Guide

## Overview
This guide provides instructions for writing E2E tests in the `/e2e/` directory using TypeScript and Playwright. Tests follow the Page Object Model pattern and utilize data factories for test data management.

## Environment Setup

### Running Tests
```bash
# From the e2e directory
cd e2e

# Run all tests
yarn test

# Run specific test file
yarn test tests/admin/feature.test.ts

# Run with visible browser (debugging)
yarn test --debug

# Run with specific timeout
yarn test --timeout=60000

# Keep environment running after test (useful for Playwright MCP exploration)
PRESERVE_ENV=true yarn test

# Enable debug logging
DEBUG=@tryghost/e2e:* yarn test
```

## Test Organization

### Directory Structure
```
e2e/
├── tests/
│   ├── admin/           # Admin panel tests
│   ├── public/          # Public site tests
│   └── [area]/          # Other test areas
├── helpers/
│   ├── pages/           # Page Objects
│   │   ├── admin/       # Admin page objects
│   │   └── public/      # Public page objects
│   └── playwright/      # Test fixtures and setup
└── data-factory/        # Test data generators
```

### Test File Naming
- Test files: `[PageName].test.ts` - Named after the page being tested (e.g., `PostEditor.test.ts`, `MembersList.test.ts`)
- Page objects: `[Feature]Page.ts` (PascalCase)
- Use descriptive names that clearly indicate what's being tested

## Page Object Pattern

### Core Principles
1. **ALL selectors must be in Page Objects** - Never put selectors in test files
2. **Page Objects encapsulate page structure and interactions**
3. **Reuse existing Page Objects when possible**
4. **Create focused, single-responsibility Page Objects**

### Creating a Page Object

```typescript
// e2e/helpers/pages/admin/FeaturePage.ts
import {Page, Locator} from '@playwright/test';
import {AdminPage} from './AdminPage';

export class FeaturePage extends AdminPage {
    // Define locators as readonly properties
    readonly elementName: Locator;
    readonly buttonName: Locator;
    readonly modalDialog: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/[path]';

        // Selector priority (use in this order):
        // 1. data-testid
        this.elementName = page.getByTestId('element-id');

        // 2. ARIA roles with accessible names
        this.buttonName = page.getByRole('button', {name: 'Button Text'});

        // 3. Labels for form elements
        this.elementName = page.getByLabel('Field Label');

        // 4. Text content (for unique text)
        this.elementName = page.getByText('Unique text');

        // 5. Avoid CSS/XPath selectors unless absolutely necessary
    }

    // Action methods
    async performAction(): Promise<void> {
        await this.buttonName.click();
    }

    async fillForm(data: {field1: string; field2: string}): Promise<void> {
        await this.field1Input.fill(data.field1);
        await this.field2Input.fill(data.field2);
    }

    // State verification methods
    async isElementVisible(): Promise<boolean> {
        return await this.elementName.isVisible();
    }

    async getElementText(): Promise<string> {
        return await this.elementName.textContent() || '';
    }

    // Common utility methods (add to AdminPage or BasePage for reuse)
    async pressEscape(): Promise<void> {
        await this.page.keyboard.press('Escape');
    }

    async waitForAutoSave(): Promise<void> {
        await this.page.waitForFunction(() => {
            const status = document.querySelector('[data-test="status"]');
            return status?.textContent?.includes('Saved');
        });
    }
}
```

### Modal/Dialog Pattern

```typescript
export class FeatureModal {
    private readonly page: Page;
    readonly modal: Locator;
    readonly closeButton: Locator;
    readonly saveButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.modal = page.getByRole('dialog');
        this.closeButton = this.modal.getByRole('button', {name: 'Close'});
        this.saveButton = this.modal.getByRole('button', {name: 'Save'});
    }

    async waitForVisible(): Promise<void> {
        await this.modal.waitFor({state: 'visible'});
    }

    async waitForHidden(): Promise<void> {
        await this.modal.waitFor({state: 'hidden'});
    }

    async close(): Promise<void> {
        await this.closeButton.click();
        await this.waitForHidden();
    }

    async isVisible(): Promise<boolean> {
        return await this.modal.isVisible();
    }
}
```

### Extending Base Pages

```typescript
// Admin pages extend AdminPage
export class PostEditorPage extends AdminPage {
    // Implementation
}

// Public pages extend BasePage
export class PublicHomePage extends BasePage {
    // Implementation
}
```

## Writing Tests

### Test Structure (AAA Pattern)

**Important: Write self-documenting tests without comments. Test names and method names should clearly express intent. If complex logic is needed, extract it to a well-named method in the Page Object.**

Tests should follow the **Arrange-Act-Assert (AAA)** pattern:
- **Arrange**: Set up test data and page objects
- **Act**: Perform the actions being tested
- **Assert**: Verify the expected outcomes

The structure should be visually clear through spacing, not comments:

```typescript
import {test, expect} from '../../helpers/playwright';
import {FeaturePage} from '../../helpers/pages/admin/FeaturePage';
import {createPostFactory} from '../../data-factory';

test.describe('Feature Name', () => {
    test('should perform expected behavior', async ({page, ghostInstance}) => {
        // Arrange
        const featurePage = new FeaturePage(page);
        const postFactory = createPostFactory(page.request);
        const post = await postFactory.create({title: 'Test Post'});

        // Act
        await featurePage.goto();
        await featurePage.performAction();

        // Assert
        expect(await featurePage.isElementVisible()).toBe(true);
        expect(await featurePage.getResultText()).toContain('Expected text');
    });
});
```

### Test Fixtures

The `page` fixture provides:
- Pre-authenticated browser session (logged into Ghost admin)
- Automatic cleanup after test

The `ghostInstance` fixture provides:
- `baseUrl`: The URL of the Ghost instance
- `database`: Database name for this test
- `port`: Port number the instance is running on

```typescript
test('example with fixtures', async ({page, ghostInstance}) => {
    // page is already authenticated
    // ghostInstance provides instance details if needed
    console.log('Testing on:', ghostInstance.baseUrl);
});
```

## Data Factories

### Using Data Factories

Data factories provide a clean way to create test data. Import the factory you need and use it to generate data with specific attributes.

```typescript
import {createPostFactory, createMemberFactory} from '../../data-factory';

test('test with data', async ({page}) => {
    const postFactory = createPostFactory(page.request);
    const memberFactory = createMemberFactory(page);

    const post = await postFactory.create({
        title: 'Test Post',
        content: 'Test content',
        status: 'published'
    });

    const member = await memberFactory.create({
        name: 'Test Member',
        email: 'test@example.com'
    });

    const postEditorPage = new PostEditorPage(page);
    await postEditorPage.gotoExistingPost(post.id);
});
```

### Factory Pattern
Factories are available for various Ghost entities. Check the `data-factory` directory for available factories. Common examples include:
- Creating posts with different statuses and content
- Creating members with subscriptions
- Creating staff users with specific roles
- Creating tags, offers, and other entities

New factories are added as needed. When you need test data that doesn't have a factory yet, consider creating one rather than manually constructing the data.

## Best Practices

### DO's
✅ **Use Page Objects for all selectors**
✅ **Write self-documenting tests** with clear method and test names
✅ **Check existing Page Objects before creating new ones**
✅ **Use proper waits** (`waitForLoadState`, `waitFor`, etc.)
✅ **Keep tests isolated** - Each test gets its own Ghost instance
✅ **Use descriptive test names** that explain what's being tested
✅ **Extract complex logic to well-named methods** in Page Objects
✅ **Use data factories** for complex test data
✅ **Add meaningful assertions** beyond just visibility checks

### DON'Ts
❌ **Never put selectors in test files**
❌ **Don't write comments** - make code self-documenting instead
❌ **Don't use hardcoded waits** (`page.waitForTimeout`)
❌ **Don't use networkidle in waits** (`page.waitForLoadState('networkidle')`) - rely on web assertions to assess readiness instead
❌ **Don't depend on test execution order**
❌ **Don't manually log in** - use the pre-authenticated fixture
❌ **Avoid CSS/XPath selectors** - use semantic selectors
❌ **Don't create test data manually** if a factory exists

## Common Patterns

### Waiting for Elements

```typescript
// Good - explicit waits
await element.waitFor({state: 'visible'});
await page.waitForSelector('[data-test="element"]');

// Bad - arbitrary timeouts
await page.waitForTimeout(5000); // Avoid this!
```

### Handling Async Operations

```typescript
// Wait for save to complete
await page.waitForFunction(() => {
    const status = document.querySelector('[data-test="status"]');
    return status?.textContent?.includes('Saved');
});
```

### Working with iframes

```typescript
// Access iframe content
const iframe = page.locator('iframe[title="preview"]');
const frameContent = iframe.contentFrame();
await frameContent.click('button');
```

### Keyboard Shortcuts

```typescript
// Press keyboard keys
await page.keyboard.press('Escape');
await page.keyboard.press('Control+S');
await page.keyboard.type('Hello World');
```

## Ghost-Specific Patterns

### Common Selectors
- Navigation: `data-test-nav="[section]"`
- Buttons: `data-test-button="[action]"`
- Lists: `data-test-list="[name]"`
- Modals: `[role="dialog"]` or `.gh-modal`
- Loading states: `.gh-loading-spinner`

### Admin URLs
- Editor: `/ghost/#/editor/post/[id]`
- Posts list: `/ghost/#/posts`
- Settings: `/ghost/#/settings`
- Members: `/ghost/#/members`

### Common UI Elements
- Buttons: `.gh-btn-[color]` (e.g., `.gh-btn-primary`)
- Inputs: Often use `name` or `placeholder` attributes
- Status indicators: `[data-test="status"]`

## Using Playwright MCP for Page Object Discovery

When creating new Page Objects or discovering selectors for unfamiliar UI:

### 1. Start Ghost with Preserved Environment
```bash
# Start Ghost and keep it running
PRESERVE_ENV=true yarn test

# The test will output the Ghost instance URL (usually http://localhost:2369)
```

### 2. Use Playwright MCP to Explore
```javascript
// Navigate to the Ghost instance
mcp__playwright__browser_navigate({url: "http://localhost:2369/ghost"})

// Capture the current DOM structure
mcp__playwright__browser_snapshot()

// Interact with elements to discover selectors
mcp__playwright__browser_click({element: "Button description", ref: "selector-from-snapshot"})

// Take screenshots for reference
mcp__playwright__browser_take_screenshot({filename: "feature-state.png"})
```

### 3. Extract Selectors for Page Objects
Based on your exploration, create the Page Object with discovered selectors:
- Note the element references from snapshots
- Identify the best selector strategy (testId, role, label, text)
- Test interactions before finalizing the Page Object

## Debugging

### Debug Mode
```bash
# See browser while test runs
yarn test --debug

# UI mode for interactive debugging
yarn test --ui
```

### Debug Logging
```bash
# Enable all e2e debug logs
DEBUG=@tryghost/e2e:* yarn test

# Specific debug namespace
DEBUG=@tryghost/e2e:ghost-fixture yarn test
```

### Preserve Environment
```bash
# Keep containers running after test
PRESERVE_ENV=true yarn test
```

### Test Artifacts
- Screenshots on failure: `test-results/`
- Playwright traces: `test-results/`

## Test Isolation

Each test automatically gets:
1. **Fresh Ghost instance** with unique database
2. **Unique port** to avoid conflicts
3. **Pre-authenticated session**
4. **Automatic cleanup** after test completion

You don't need to worry about:
- Database cleanup
- Port conflicts
- Login/logout
- Test data pollution

## Validation Checklist

Before submitting a test:
- [ ] All selectors are in Page Objects
- [ ] Test follows AAA pattern
- [ ] Test is deterministic (not flaky)
- [ ] Uses proper waits (no arbitrary timeouts)
- [ ] Has meaningful assertions
- [ ] Follows naming conventions
- [ ] Reuses existing Page Objects where possible
- [ ] Test passes locally
- [ ] Test fails for the right reason (if demonstrating a bug)

## Quick Reference

### Essential Imports
```typescript
import {test, expect} from '../../helpers/playwright';
import {PageName} from '../../helpers/pages/admin/PageName';
import {createPostFactory} from '../../data-factory';
```

### Test Template
```typescript
test.describe('Feature', () => {
    test('specific behavior', async ({page, ghostInstance}) => {
        // Arrange
        const pageObject = new PageObject(page);

        // Act
        await pageObject.goto();
        await pageObject.action();

        // Assert
        expect(await pageObject.getState()).toBe(expected);
    });
});
```

### Run Commands
```bash
yarn test                           # All tests
yarn test path/to/test.ts          # Specific test
yarn test --debug                   # With browser
yarn test --grep "pattern"         # Pattern matching
PRESERVE_ENV=true yarn test         # Keep environment
DEBUG=@tryghost/e2e:* yarn test     # Debug logs
```
