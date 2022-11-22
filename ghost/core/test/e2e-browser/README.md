## Browser testing

#### Install

As per the [docs](https://playwright.dev/docs/intro#manually), run the following to install the supported browsers for Playwright:

```
npx playwright install
```

#### Running tests

Run the browser test suite with `yarn test:browser`.

#### Record test instructions

After installing PlayWright, start to record tests using `yarn test:browser:record`.

Available flags:
* `--admin` - Runs a test starting in Ghost Admin
* `--no-setup` - When testing Ghost Admin, prevents the automated setup from running (for testing the setup wizard)
* `--fixtures="posts,users"` - Install a set of fixtures, given as a comma-delimited list

When the window loads, hit the record button and click around. All of the link click steps will need to be tidied up to use better selectors, and any `page.goto` calls should be dropped (as they are likely a result of clicking links). The test generator is a useful assistant, but be wary of taking anything it generates as correct.

#### Writing tests

Recording tests will allow you to execute the steps in a browser that a user would follow. It's important to add assertions to ensure that we're not just testing that the site doesn't crash, but that we see the expected values on the page.

The test suite uses `beforeAll` and `afterAll` to setup Ghost and install fixtures. Each set of fixtures should have a new `describe` block to start a new instance of Ghost to be tested against.
