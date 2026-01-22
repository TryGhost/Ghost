## Browser testing

Further documentation on Playwright and writing tests can be found in the [Ghost's Playwright Tests docs](https://ghost.notion.site/Playwright-Tests-b49ccb6e2b4a40f1a4f8df5261391218).

#### Install

As per the [docs](https://playwright.dev/docs/intro#manually), run the following to install the supported browsers for Playwright:

```
npx playwright install
```

#### Running tests

Tests should be run from the root of the repository, using `yarn test:browser` rather than from the `ghost/core` directory.

Running from the root ensures that all of Ghost's apps are built from the local source code and made available to the test runner.

#### Writing tests

It's important to add assertions to ensure that we're not just testing that the site doesn't crash, but that we see the expected values on the page.

The test suite uses `beforeAll` and `afterAll` to setup Ghost and install fixtures. Each set of fixtures should have a new `describe` block to start a new instance of Ghost to be tested against.
