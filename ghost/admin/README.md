# Ghost-Admin

This is the home of the Ember.js-based Admin app that ships with [Ghost](https://github.com/tryghost/ghost).

## Test

### Running tests in the browser

Run all tests in the browser by running `yarn dev` in the Ghost monorepo and visiting http://localhost:4200/tests. The code is hotloaded on change and you can filter which tests to run.

[Testing public documentation](https://ghost.notion.site/Testing-Ember-560cec6700fc4d37a58b3ba9febb4b4b)

---

Tip: You can use `await this.pauseTest()` in your tests to temporarily pause the execution of browser tests. Use the browser console to inspect and debug the DOM, then resume tests by running `resumeTest()` directly in the browser console ([docs](https://guides.emberjs.com/v3.28.0/testing/testing-application/#toc_debugging-your-tests))


### Running tests in the CLI

To build and run tests in the CLI, you can use:

```bash
TZ=UTC yarn test
```
_Note the `TZ=UTC` environment variable which is currently required to get tests working if your system timezone doesn't match UTC._

---

However, this is very slow when writing tests, as it requires the app to be rebuilt on every change. Instead, create a separate watching build with:

```bash
yarn build --environment=test -w -o="dist-test"
```

Then run tests with:

```bash
TZ=UTC yarn test 1 --reporter dot --path="dist-test"
```

The `--reporter dot` shows a dot (`.`) for every successful test, and `F` for every failed test. It renders the output of the failed tests only.

---

To run a specific test file:
```bash
TZ=UTC yarn test 1 --reporter dot --path="dist-test" -mp=tests/unit/helpers/gh-count-characters-test.js
```

---

To have a full list of the available options, run
```bash
ember exam --help
```

# Copyright & License

Copyright (c) 2013-2024 Ghost Foundation - Released under the [MIT license](LICENSE). Ghost and the Ghost Logo are trademarks of Ghost Foundation Ltd. Please see our [trademark policy](https://ghost.org/trademark/) for info on acceptable usage.
