# @tryghost/e2e - End-to-End Test Suite

This package contains the full end-to-end (E2E) test suite for Ghost, built using [Playwright](https://playwright.dev/).

## Purpose

The primary goal of these tests is to simulate real user scenarios and verify that critical user flows within Ghost are functioning correctly. This includes frontend interactions, admin panel operations, and integrations where applicable.

## Principles
- Tests should be able to run against your local Ghost site or a live site on the internet (i.e. in staging/production)
- Tests should use Ghost like a real user would
- Tests should be able to run against all live external dependencies (i.e. Stripe) and _also_ be able to run against mocked versions of these dependencies
- Tests should be expressive, succinct and easy to write
- Tests should make as few assumptions as possible — assumptions are for unit tests, e2e tests are for testing assumptions
- Tests should be fast and stable (re: not flaky)

## Architecture

### Playwright
This e2e test suite uses Playwright to automate a web browser and use the app as a real user would. The tests run independently from the system under test (Ghost), rather than hooking into Ghost to e.g. start and stop a development server. We should always be able to run this test suite by passing in a few configuration parameters via environment variables, like the base URL for the site we want to test.

### Managing State
One of the key considerations in building a test suite such as this is how we manage state, which includes the MySQL database state and increasingly state that is kept in other services, i.e. Tinybird for analytics data. One approach we could use here is to hook into Ghost itself to i.e. truncate database tables and load new fixtures. As much as possible, we should avoid doing this, because it couples our tests too closely with the application code. Another, IMO better approach is to directly manage the state in whatever system it is stored in from the test suite itself. For example, rather than hooking into Ghost to truncate tables and load fixtures, we should build the infrastructure to allow the test suite to talk directly to MySQL and change the state itself. 

### Dealing with external services
Our current e2e test suites were designed in a world where Ghost was mostly just a blog — a simple node application with a MySQL database. In that world, it's fairly easy to write end-to-end tests, because we control the whole stack. Increasingly Ghost needs to communicate with external services — Stripe, Tinybird, Email APIs — which we do not have complete control over. As such, we likely need a more robust strategy for testing against these external services and/or mocking them.

Wherever possible, I think we should aim to support two modes for external services:
- Live mode: run against the real thing, i.e. in production test against the real Stripe API
- Mocked mode: run against a mock of the real thing, i.e. test against a mock Stripe API server

A good example of this that is currently implemented is email:
- In the `admin.spec.ts` file, we login to Ghost Admin and go through the 2FA flow. To successfully operate this just as a user would, we need to be able to receive and inspect emails that are sent from Ghost. The `EmailService` in test/services supports two different modes for this:
1. Live mode with MailSlurp: when testing against a live site on Pro, we need to use a real email address that Ghost can actually send an email to. MailSlurp allows us to create live, ephemeral inboxes where we can receive emails, then query for the received emails via API and inspect the messages. In the example of 2FA, we login with a Staff user whose email in Ghost is set to the address of one of these ephemeral inboxes. Ghost sends the OTP code to this email address over the actual internet, and the tests inspect the received email to extract the code, then input it into Ghost, exactly as a real user would do.
2. Mock mode with MailHog: Operating in live mode gives us more confidence because we're making fewer assumptions in our tests, but that confidence comes at a cost: speed and stability. Sending emails from Ghost(Pro) to a real address on the open internet incurs additional network latency and consequently has more potential for flaky behavior. For that reason, we also support running with a mocked email service, MailHog. We run MailHog locally (via docker compose), point Ghost's email configuration to the MailHog service so the emails are sent from Ghost > MailHog over the local network, then we retrieve the emails MailHog receives by an API call over the local network.

An important distinction is that we aren't changing any behavior within Ghost — we're not injecting code into the application to handle things differently when in live vs mocked mode. We are simply pointing Ghost to either the real thing, or a mocked version of the real thing that we control. Put another way, Ghost shouldn't have to know or care that the external service has been mocked — it makes requests to the external service as usual, using the exact same code paths whether the tests are running in live or mocked mode.

## Structure
We can and should iterate on the structure of this package to keep it as intuitive as possible, while making it easy to extend and improve to cover additional use-cases. This section provides a mile-high, aerial view of the directory structure, which will hopefully help to understand the scope of what all is included in this package.

```


```

## Prerequisites

Before running these tests, ensure you have:

1.  **Cloned the Ghost repository** and are in the root directory.
2.  **Installed top-level dependencies**: Run `yarn` in the Ghost root directory.
3.  **Installed Playwright browsers**: While Playwright is a dependency of this package, you might need to install the browser binaries it uses. From the `apps/e2e` directory, you can run:
    ```bash
    yarn playwright install --with-deps chromium # Installs Chromium and its OS dependencies
    # or to install all default browsers (Chromium, Firefox, WebKit)
    # yarn playwright install --with-deps


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

