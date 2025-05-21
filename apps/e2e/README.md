# @tryghost/e2e - End-to-End Test Suite

This package contains the full end-to-end (E2E) test suite for Ghost, built using [Playwright](https://playwright.dev/).

## Purpose

The primary goal of these tests is to simulate real user scenarios and verify that critical user flows within Ghost are functioning correctly. This includes frontend interactions, admin panel operations, and integrations where applicable.

## Prerequisites

Before running these tests, ensure you have:

1.  **Cloned the Ghost repository** and are in the root directory.
2.  **Installed top-level dependencies**: Run `yarn` in the Ghost root directory.
3.  **Installed Playwright browsers**: While Playwright is a dependency of this package, you might need to install the browser binaries it uses. From the `apps/e2e` directory, you can run:
    ```bash
    yarn playwright install --with-deps chromium # Installs Chromium and its OS dependencies
    # or to install all default browsers (Chromium, Firefox, WebKit)
    # yarn playwright install --with-deps
    ```

## Configuration

Test behavior is configured primarily through environment variables, typically managed in an `.env` file within the `apps/e2e` directory.

### `.env` File

Create an `.env` file in the `apps/e2e` directory by copying the example:

```bash
cp apps/e2e/.env.example apps/e2e/.env
```

Then, populate `apps/e2e/.env` with the necessary values:

*   `BASE_URL`: The base URL of the Ghost instance to test against (e.g., `http://localhost:2368` for a local instance, or your live site URL).
*   `ADMIN_USERNAME`: Username (email) for the admin user.
*   `ADMIN_PASSWORD`: Password for the admin user.
*   `EMAIL_PROVIDER`: Specifies the email service to use for 2FA verification. Can be:
    *   `mailhog` (default if no MailSlurp key): For local testing, assumes MailHog is running.
    *   `mailslurp`: For testing against environments where emails are sent externally.
*   `MAILHOG_API_URL` (optional, defaults to `http://localhost:8025`): The API URL for your MailHog instance if it's not running on the default.
*   `MAILSLURP_API_KEY` (required if `EMAIL_PROVIDER` is `mailslurp`): Your MailSlurp API key.
*   `MAILSLURP_INBOX_ID` (required if `EMAIL_PROVIDER` is `mailslurp`): The ID of the MailSlurp inbox to use.

**Important for 2FA:**
*   When using `mailhog`, ensure the `ADMIN_USERNAME` is the email address your local Ghost instance is configured to send emails to (which MailHog will capture).
*   When using `mailslurp`, ensure the Ghost user account associated with `ADMIN_USERNAME` has its email address set to the email address of the specified MailSlurp inbox.

### Playwright Configuration (`playwright.config.ts`)

This file (`apps/e2e/playwright.config.ts`) contains settings for test execution, including:

*   `testDir`: Directory where test files are located (`./test/e2e`).
*   `fullyParallel`: Whether to run test files in parallel.
*   `retries`: Number of retries on CI.
*   `workers`: Number of parallel workers.
*   `reporter`: Default reporter is `html`.
*   `use.trace`: Currently set to `'on'` to record traces for all test runs. Traces are invaluable for debugging.
*   `projects`: Defines browser configurations. Currently configured to run on Chromium by default. You can uncomment Firefox and WebKit to run tests on multiple browsers.

## Test Structure

Tests are organized using the **Page Object Model (POM)** pattern to enhance maintainability and readability.

*   **Test Specs**: Located in `apps/e2e/test/e2e/`. These files contain the actual test logic and describe user scenarios.
*   **Page Objects**: Located in `apps/e2e/test/page-objects/`. Each class represents a page or a significant component of a page, encapsulating its elements and interaction methods (e.g., `LoginPage.ts`, `DashboardPage.ts`).
*   **Services**: Located in `apps/e2e/test/services/`. These provide abstractions for external services, currently for email handling (e.g., `MailHogService.ts`, `MailSlurpService.ts`).
*   **Test Fixtures**: Defined in `apps/e2e/test/test-fixtures.ts`. These fixtures provide pre-configured instances of page objects, services, and common test data (like URLs and credentials) directly to your tests, reducing boilerplate.

## Running Tests

All commands should generally be run from the `apps/e2e` directory unless otherwise specified.

1.  **Navigate to the package**: `cd apps/e2e`

2.  **Run all E2E tests** (as configured in `playwright.config.ts`):
    ```bash
    yarn test:e2e
    ```

3.  **Run tests for a specific browser project**:
    ```bash
    yarn playwright test --project=chromium
    # yarn playwright test --project=firefox
    # yarn playwright test --project=webkit 
    ```
    (Ensure the project is uncommented/defined in `playwright.config.ts`)

4.  **Run tests in headed mode (to see the browser)**:
    ```bash
    yarn playwright test --headed
    # Combine with project:
    # yarn playwright test --project=chromium --headed
    ```

5.  **Run a specific test file**:
    ```bash
    yarn playwright test my-test-file.spec.ts
    ```

6.  **Run a test with a specific title**:
    ```bash
    yarn playwright test -g "should allow login"
    ```

## Viewing Reports and Traces

*   **HTML Report**: After a test run, an HTML report is generated. To view it:
    ```bash
    yarn playwright show-report
    ```
    This report includes test results, steps, and links to traces for failed (and currently, all) tests.

*   **Trace Viewer**: Traces provide a detailed timeline of test execution with DOM snapshots, actions, console logs, and network requests. You can open a specific trace file (`.zip` found in `test-results/...`) using:
    ```bash
    yarn playwright show-trace path/to/your/trace.zip
    ```

## Linting

*   Run ESLint for this package:
    ```bash
    yarn lint:code
    # Or from the root, yarn lint apps/e2e/
    ```
*   The main `yarn lint` in this package also runs `lint:test` for test-specific linting rules.

## Development Workflow

1.  Ensure your local Ghost instance (if testing locally) is running and configured correctly (URL, email to MailHog).
2.  Populate your `apps/e2e/.env` file with the correct `BASE_URL`, credentials, and `EMAIL_PROVIDER` (`mailhog` for local).
3.  Write or modify tests in `apps/e2e/test/e2e/`.
4.  Create or update Page Objects in `apps/e2e/test/page-objects/` as needed.
5.  Update fixtures in `apps/e2e/test/test-fixtures.ts` if you add new POMs or shared services.
6.  Run tests frequently during development, often in headed mode or targeting specific files/tests for speed.

This package is part of the Ghost monorepo. Follow the main contribution guidelines for the Ghost project.

