# E2E Test Writing Guide

Worked examples for writing E2E tests in `/e2e/` with TypeScript and Playwright.

This guide covers *how to build the pieces* — page objects, common interaction
patterns, and selector discovery. It deliberately does not repeat what is
already documented elsewhere:

| For | Read |
| --- | --- |
| Running tests, dev/build modes, debugging, folder layout, test isolation, fixtures | [README.md](../README.md) |
| Rules, locator priority, AAA structure, DO/DON'T, validation checklist | [AGENTS.md](../AGENTS.md) |
| Available factories and how to add one | [data-factory/README.md](../data-factory/README.md) |

## Conventions

**Filenames are kebab-case.** `eslint.config.js` enforces
`^[a-z0-9.-]+$` at error level, so `FeaturePage.ts` fails lint.

- Test files: `<behaviour>.test.ts`, named after the behaviour under test rather
  than the page — `two-factor-auth.test.ts`, `member-signup.test.ts`
- Page objects: `<feature>-page.ts` — `login-page.ts`, `admin-page.ts`
- Class names stay PascalCase: `login-page.ts` exports `class LoginPage`

**Import through the `@/` path aliases**, never relative paths. The aliases are
defined in `tsconfig.json`:

```typescript
import {expect, test} from '@/helpers/playwright';
import {LoginPage, PostsPage} from '@/admin-pages';
import {createPostFactory} from '@/data-factory';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';
```

## Page Object Pattern

### Core Principles
1. **Page Objects contain reusable page structure and interactions**
2. **Reuse existing Page Objects when possible**
3. **Create focused, single-responsibility Page Objects**
4. **Keep necessary structural selectors in Page Objects where practical**

A direct semantic locator in a test is acceptable for a small, one-off assertion or
interaction when a Page Object would add indirection without reuse.

### Creating a Page Object

```typescript
// e2e/helpers/pages/admin/feature-page.ts
import {AdminPage} from './admin-page';
import {Locator, Page} from '@playwright/test';

export class FeaturePage extends AdminPage {
    // Define locators as readonly properties
    readonly nameInput: Locator;
    readonly saveButton: Locator;
    readonly statusMessage: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/[path]';

        // Selector priority (use in this order):
        // 1. ARIA roles with accessible names
        this.saveButton = page.getByRole('button', {name: 'Save'});

        // 2. Labels for form elements
        this.nameInput = page.getByLabel('Name');

        // 3. Text content (for unique text)
        this.statusMessage = page.getByText('Saved');

        // 4. Stable test IDs when semantic locators are unavailable
        //    page.getByTestId('element-id');

        // 5. Stable structural selectors only when necessary
    }

    // Action methods
    async save(): Promise<void> {
        await this.saveButton.click();
        await this.statusMessage.waitFor({state: 'visible'});
    }

    async fillForm(data: {name: string}): Promise<void> {
        await this.nameInput.fill(data.name);
    }

    // State verification methods — return locators or values, never assert
    async getStatusText(): Promise<string> {
        return await this.statusMessage.textContent() || '';
    }
}
```

`BasePage` already provides `goto()`, `refresh()`, `pressKey()` and the `body`
locator, and sets `pageUrl` from the constructor. `AdminPage` extends it with
the `/ghost` base URL — subclasses override `pageUrl` for their own route.

### Modal/Dialog Pattern

Modals are plain classes rather than page subclasses, scoping their locators to
the dialog and waiting on visibility state as part of each action:

```typescript
import {Locator, Page} from '@playwright/test';

export class FeatureModal {
    private readonly page: Page;
    public readonly modal: Locator;
    public readonly saveButton: Locator;
    public readonly cancelButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.modal = page.getByRole('dialog');
        this.saveButton = this.modal.getByRole('button', {name: 'Save'});
        this.cancelButton = this.modal.getByRole('button', {name: 'Cancel'});
    }

    async waitForModal(): Promise<void> {
        await this.modal.waitFor({state: 'visible'});
    }

    async save(): Promise<void> {
        await this.saveButton.click();
        await this.modal.waitFor({state: 'hidden'});
    }
}
```

See `helpers/pages/admin/posts/custom-view-modal.ts` for a live example.

### Extending Base Pages

```typescript
// Admin pages extend AdminPage
export class PostEditorPage extends AdminPage {
    // Implementation
}

// Public and portal pages extend BasePage
export class PublicHomePage extends BasePage {
    // Implementation
}
```

## Common Patterns

### Waiting for Elements

```typescript
// Good - wait on a locator's state, or use a web assertion
await element.waitFor({state: 'visible'});
await expect(page.getByRole('status')).toContainText('Saved');

// Bad - arbitrary timeouts and networkidle
await page.waitForTimeout(5000);
await page.waitForLoadState('networkidle');
```

### Handling Async Operations

Wait for the UI signal the user would look for, not a fixed delay:

```typescript
async waitForSave(): Promise<void> {
    await this.saveButton.click();
    await this.statusMessage.waitFor({state: 'visible'});
}
```

### Working with iframes

Use `frameLocator()` — it retries like any other locator:

```typescript
this.portalFrame = page.frameLocator('[data-testid="portal-popup-frame"]');
await this.portalFrame.getByRole('button', {name: 'Continue'}).click();
```

### Keyboard Shortcuts

```typescript
await page.keyboard.press('Escape');
await page.keyboard.press('Control+S');
await page.keyboard.type('Hello World');
```

## Ghost-Specific Patterns

### Common Selectors
- Navigation: `data-test-nav="[section]"`
- Buttons: `data-test-button="[action]"`
- Modals: `[role="dialog"]`
- Loading states: `.gh-loading-spinner`

Ember Admin uses `data-test-*` attributes; the React Admin apps use
`data-testid`. Prefer a role or label over either where one exists.

### Admin URLs
- Editor: `/ghost/#/editor/post/[id]`
- Posts list: `/ghost/#/posts`
- Settings: `/ghost/#/settings`
- Members: `/ghost/#/members`

## Using Playwright MCP for Page Object Discovery

When creating new Page Objects or discovering selectors for unfamiliar UI:

### 1. Start Ghost with Preserved Environment
```bash
# Start Ghost and keep it running
PRESERVE_ENV=true pnpm test

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
- Identify the best selector strategy (role, label, text, testId)
- Test interactions before finalizing the Page Object

## Test Template

```typescript
import {expect, test} from '@/helpers/playwright';
import {FeaturePage} from '@/admin-pages';
import {createPostFactory} from '@/data-factory';

test.describe('Ghost Admin - Feature', () => {
    test('action performed - expected result', async ({page}) => {
        const featurePage = new FeaturePage(page);
        const postFactory = createPostFactory(page.request);
        const post = await postFactory.create({title: 'Test Post'});

        await featurePage.goto();
        await featurePage.fillForm({name: post.title});
        await featurePage.save();

        await expect(featurePage.statusMessage).toBeVisible();
    });
});
```
