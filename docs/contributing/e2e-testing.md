# Writing Browser E2E Tests

Ghost's browser end-to-end tests live in `/e2e/` and use TypeScript and
Playwright to verify complete journeys across Ghost Admin and the public site.
This guide explains how to write and structure them.

For related guidance:

| For | Read |
| --- | --- |
| Choosing between unit, integration, acceptance, and E2E tests | [Testing Ghost](testing.md) |
| Running E2E tests, infrastructure modes, debugging, isolation, and fixtures | [E2E workspace README](../../e2e/README.md) |
| Available factories and how to add one | [Data factory README](../../e2e/data-factory/README.md) |

Workspace command examples start from the repository root and change into
`e2e/`.

## Conventions

**Filenames are kebab-case.** `eslint.config.js` enforces
`^[a-z0-9.-]+$` at error level, so `FeaturePage.ts` fails lint.

- Test files: `<behaviour>.test.ts`, named after the behaviour under test rather
  than the page — `two-factor-auth.test.ts`, `member-signup.test.ts`
- Page objects: `<feature>-page.ts` — `login-page.ts`, `admin-page.ts`
- Class names stay PascalCase: `login-page.ts` exports `class LoginPage`

In tests, import shared helpers and page objects through the `@/` path aliases
defined in `e2e/tsconfig.json`:

```typescript
import {expect, test} from '@/helpers/playwright';
import {LoginPage, PostsPage} from '@/admin-pages';
import {createPostFactory} from '@/data-factory';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';
```

Page-object modules use relative imports for nearby base classes and sibling
modules where appropriate.

Use Arrange–Act–Assert as a readability heuristic: set up the scenario,
perform the behaviour under test, then verify the outcome. Make the phases
clear through structure and naming; add comments only when the boundary would
otherwise be unclear. Keep each test focused on one scenario and write its name
and flow so that someone without detailed knowledge of the implementation can
understand the behaviour being checked.

Use factories for test data. Keep their defaults for data that does not affect
the scenario, and only override the values needed for the behaviour and
assertions in that test.

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

        // 3. Text content when the text is unique
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

Ember Admin commonly uses `data-test-*` attributes and the React Admin apps use
`data-testid`. Prefer a role, label, or unique visible text where one exists.

### Admin URLs
- Editor: `/ghost/#/editor/post/[id]`
- Posts list: `/ghost/#/posts`
- Settings: `/ghost/#/settings`
- Members: `/ghost/#/members`

## Discovering Locators

When creating a Page Object for unfamiliar UI, preserve the test environment
after a run and inspect the rendered page with Playwright Inspector or browser
developer tools.

### Preserve the test environment

```bash
cd e2e

# Start Ghost and keep it running
PRESERVE_ENV=true pnpm test

# The test will output the Ghost instance URL (usually http://localhost:2369)
```

The test output provides the preserved Ghost instance URL, usually
`http://localhost:2369`. Open that URL, exercise the interaction, and inspect
the accessibility tree and relevant attributes.

Choose the locator using the priority above and verify the interaction before
adding it to the Page Object. If the UI has no reliable semantic locator, add a
stable test ID to the product code rather than coupling the test to styling or
DOM position.

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

After changing E2E tests, run the focused test as well as the workspace lint
and type checks:

```bash
cd e2e

pnpm test tests/admin/signin.test.ts
pnpm lint
pnpm test:types
```
