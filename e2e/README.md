# Ghost End-To-End Test Suite

This test suite runs automated browser tests against a running Ghost instance to ensure critical user journeys work correctly.

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Node.js and Yarn installed

### Running Tests
From the repository root:

```bash
# Install dependencies
yarn

# Run the e2e tests
yarn test:e2e
```

### Running Specific Tests

Within `e2e` folder, run one of the following commands: 

```bash
# All tests
yarn test

# Specific test file
yarn test specific/folder/testfile.spec.ts

# Matching a pattern
yarn test --grep "homepage"

# With browser visible (for debugging)
yarn test --debug
```

## Tests Development

The test suite is organized into separate directories for different areas/functions:

### **Current Test Suites**
- `tests/public/` - Public-facing site tests (homepage, posts, etc.)
- `tests/admin/` - Ghost admin panel tests (login, content creation, settings)

We can decide on additional sub-folders as we go.

Example structure for admin tests:
```text
tests/admin/
├── login.spec.ts
├── posts.spec.ts
└── settings.spec.ts
```

Project folder structure can be seen below: 

```text
e2e/
├── tests/                      # All the tests
│   ├── public/                 # Public site tests
│   │   └── testname.spec.ts    # Test cases
│   ├── admin/                  # Admin site tests
│   │   └── testname.spec.ts    # Test cases
│   ├── global.setup.ts         # Global setup script
│   ├── global.teardown.ts      # Global teardown script
│   └── .eslintrc.js            # Test-specific ESLint config
├── helpers/                    # All helpers that support the tests, utilities, fixtures, page objects etc.
│   ├── playwright/             # Playwright specific helpers
│   │   └── fixture.ts          # Playwright fixtures
│   ├── pages/                  # Page Object Models
│   │   └── HomePage.ts         # Page Object
│   ├── utils/                  # Utils
│   │   └── math.ts             # Math related utils   
│   └── index.ts                # Main exports
├── playwright.config.mjs       # Playwright configuration
├── package.json                # Dependencies and scripts
└── tsconfig.json               # TypeScript configuration
```

### Writing Tests

Tests use [Playwright Test](https://playwright.dev/docs/writing-tests) framework with page objects.
Aim to format tests in Arrange Act Assert style - it will help you with directions when writing your tests.

```typescript
test.describe('Ghost Homepage', () => {
    test('loads correctly', async ({page}) => {
        // ARRANGE - setup fixtures, create helpers, prepare things that helps will need to be executed
        const homePage = new HomePage(page);
        
        // ACT - do the actions you need to do, to verify certain behaviour
        await homePage.goto();
        
        // ASSERT
        await expect(homePage.title).toBeVisible();
    });
});
```

### Using Page Objects

Page objects encapsulate page elements, and interactions. To read more about them, check [this link out](https://www.selenium.dev/documentation/test_practices/encouraged/page_object_models/) and [this link](https://martinfowler.com/bliki/PageObject.html).

```typescript
// Create a page object for admin login
export class AdminLoginPage {
    private pageUrl:string;
    
    constructor(private page: Page) {
        this.pageUrl = '/ghost'
    }

    async goto(urlToVisit = this.pageUrl) {
        await this.page.goto(urlToVisit);
    }
    
    async login(email: string, password: string) {
        await this.page.fill('[name="identification"]', email);
        await this.page.fill('[name="password"]', password);
        await this.page.click('button[type="submit"]');
    }
}
```

### Global Setup and Teardown

Tests use [Project Dependencies](https://playwright.dev/docs/test-global-setup-teardown#option-1-project-dependencies) to define special tests as global setup and teardown tests:

- Global Setup: `tests/global.setup.ts` - runs once before all tests
- Global Teardown: `tests/global.teardown.ts` - runs once after all tests

### Playwright Fixtures

[Playwright Fixtures](https://playwright.dev/docs/test-fixtures) are defined in `helpers/playwright/fixture.ts` and provide reusable test setup/teardown logic.
For example, a `ghostInstance` fixture creates a new Ghost instance with its own database for each test, to ensure isolation between tests.

### Test Isolation 

Test isolation is extremely important to avoid flaky tests that are hard to debug. For the most part, you shouldn't have to worry about this when writing tests, because each test gets a fresh Ghost instance with its own database:

- Global setup (`tests/global.setup.ts`):
    - Starts shared services (MySQL, Tinybird, etc.)
    - Runs Ghost migrations to create a template database
    - Saves a snapshot of the template database using `mysqldump`
- Before each test (`helpers/playwright/fixture.ts`):
    - Creates a new database by restoring from the template snapshot
    - Starts a new Ghost container connected to the new database
- After each test (`helpers/playwright/fixture.ts`):
    - Stops and removes the Ghost container
    - Drops the test database
- Global teardown (`tests/global.teardown.ts`):
    - Stops and removes shared services

### Best Practices

1. **Use page object patterns** to separate page elements, actions on the pages, complex logic from tests. They should help you make them more readable and UI elements reusable.
2. **Add meaningful assertions** beyond just page loads. Keep assertions in tests.
3. **Use `data-testid` attributes** for reliable element selection, in case you **cannot** locate elements in a simple way. Example: `page.getByLabel('User Name')`. Avoid, css, xpath locators - they make tests brittle. 
4. **Clean up test data** when tests modify Ghost state
5. **Group related tests** in describe blocks
6. **Do not use should to describe test scenarios**

## CI Integration

Tests run automatically in GitHub Actions on every PR and commit to `main`.

### CI Process

1. **Setup**: Ubuntu runner with Node.js and MySQL
2. **Docker Build & Push**: Build Ghost image and push to GitHub Container Registry
3. **Pull Images**: Pull Ghost, MySQL, Tinybird, etc. images
4. **Test Execution**:
   - Wait for Ghost to be ready
   - Run Playwright tests
   - Upload test artifacts

## Available Scripts

From the e2e directory:

```bash
# Run all tests
yarn test

# Debug failed tests (keeps containers)
PRESERVE_ENV=true yarn test

# Run TypeScript type checking
yarn test:types

# Lint code and tests
yarn lint

# Build (for utilities)
yarn build
yarn dev           # Watch mode for TypeScript compilation
```

## Resolving issues

### Test Failures

1. **Screenshots**: Playwright captures screenshots on failure
2. **Traces**: Available in `test-results/` directory
3. **Debug Mode**: Run with `yarn test --debug` or `yarn test --ui` to see browser
4. **Verbose Logging**: Check CI logs for detailed error information
