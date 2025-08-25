# Adopt Page Objects Pattern for E2E Test Organization

## Status
Proposed

## Context

Our Playwright tests currently interact directly with page elements using raw selectors and actions scattered throughout test files. This approach leads to several issues:

- **Code duplication**: The same selectors and interactions are repeated across multiple tests
- **Maintenance burden**: When UI changes, we need to update selectors in many places
- **Poor readability**: Tests are cluttered with low-level DOM interactions instead of focusing on business logic
- **Fragile tests**: Direct coupling between tests and implementation details makes tests brittle

To improve **maintainability**, **readability**, and **test stability**, we want to adopt the Page Objects pattern to encapsulate page-specific knowledge and provide a clean API for test interactions.

The Page Objects pattern was originally described by [Martin Fowler](https://martinfowler.com/bliki/PageObject.html) as a way to "wrap an HTML page, or fragment, with an application-specific API, allowing you to manipulate page elements without digging around in the HTML."

## Decision

We will adopt the Page Objects pattern for organizing E2E tests. Every page or major UI component should have a corresponding page object class that:

1. **Encapsulates locators**: All element selectors are defined in one place
2. **Provides semantic methods**: Expose high-level actions like `login()`, `createPost()`, `navigateToSettings()`
3. **Abstracts implementation details**: Tests interact with business concepts, not DOM elements
4. **Centralizes page-specific logic**: Complex interactions and waits are handled within page objects
5. **Assertions live in test files**: Page Objects may include readiness guards (e.g., locator.waitFor({state: 'visible'})) before actions, business assertions (expect(...)) should be in tests
6. **Expose semantic locators, hide selectors**: Page Objects should surface public readonly Locators for tests to assert on, while keeping selector strings and construction internal

## Guidelines

Following both [Fowler's original principles](https://martinfowler.com/bliki/PageObject.html) and modern Playwright best practices:

- ✅ **One page object per logical page or major component** (e.g., `LoginPage`, `PostEditor`, `AdminDashboard`)
- ✅ **Model the structure that makes sense to the user**: not necessarily the HTML structure
- ✅ **Use descriptive method names** that reflect user actions (e.g., `fillPostTitle()` not `typeInTitleInput()`)
- ✅ **Return elements or data**: for assertions in tests (e.g., `getErrorMessage()` returns locator)
- ✅ **Include wait methods**: for page readiness and async operations (e.g., `waitForErrorMessage()`)
- ✅ **Chain related actions**: in fluent interfaces where it makes sense
- ✅ **Keep assertions in test files**: page objects should return data/elements, tests should assert
- ✅ **Handle concurrency issues** within page objects (async operations, loading states)
- ✅ **Expose Locators (read-only), not raw selector strings**: you can tests assert against public locators (Playwright encourages it, with helpers on assertion) 
  - `loginPage.saveButton.click` instead of `page.locator('[data-testid="save-button"]')`  
- ✅ **Selector priority: prefer getByRole / getByLabel / data-testid over CSS or XPath.**: add data-testid attributes where needed for stability
- ✅ **Use guards, not assertions, in POM**: prefer locator.waitFor({state:'visible'})
- 🚫 **Don't include expectations/assertions** in page object methods (following Fowler's recommendation)
- 📁 **Organize in `/e2e/helpers/pages/` directory** with clear naming conventions

## Example

```ts
// e2e/helpers/pages/admin/LoginPage.ts
export class LoginPage extends BasePage {
  public readonly emailInput = this.page.locator('[data-testid="email-input"]');
  public readonly passwordInput = this.page.locator('[data-testid="password-input"]');
  public readonly loginButton = this.page.locator('[data-testid="login-button"]');
  public readonly errorMessage = this.page.locator('[data-testid="login-error"]');

  constructor(page: Page) {
      super(page);
      this.pageUrl = '/login';
  }
  
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async waitForErrorMessage() {
    await this.errorMessage.waitFor({ state: 'visible' });
    return this.errorMessage;
  }

  getErrorMessage() {
    return this.errorMessage;
  }
}

// In test file
test.describe('Login', () => {
    test('invalid credentials', async ({page}) => {
        // Arrange
        const loginPage = new LoginPage(page);

        // Act
        await loginPage.goto();
        await loginPage.login('invalid@email.com', 'wrongpassword');
        const errorMessage = await loginPage.waitForErrorMessage();

        // Assert
        await expect(errorMessage).toHaveText('Invalid credentials');
    });
}
```

## References

- [Page Object - Martin Fowler](https://martinfowler.com/bliki/PageObject.html) - Original pattern definition
- [Selenium Page Objects](https://selenium-python.readthedocs.io/page-objects.html) - Early implementation guidance
- [Playwright Page Object Model](https://playwright.dev/docs/pom) - Modern Playwright-specific approaches
