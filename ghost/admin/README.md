# Ghost-Admin

![](https://github.com/TryGhost/Admin/workflows/Test%20Suite/badge.svg?branch=main)

This is the home of Ember.js based admin app that ships with [Ghost](https://github.com/tryghost/ghost).

**Do you want to set up a Ghost blog?** Check the [getting started guide](https://ghost.org/docs/introduction/)

**Do you want to modify or contribute to Ghost-Admin?** Please read how to [install from source](https://ghost.org/docs/install/source/) and swing by our [forum](https://forum.ghost.org) if you need any help 😄

## Running tests

Build and run tests once:

```bash
TZ=UTC yarn test
```
_Note the `TZ=UTC` environment variable which is currently required to get tests working if your system timezone doesn't match UTC._

If you are serving the admin app (e.g., when running `yarn serve`, or when running `yarn dev` in the main Ghost project),  you can also run the tests in your browser by going to http://localhost:4200/tests. 

This has the additional benefit that you can use `await this.pauseTest()` in your tests to temporarily pause tests (best to also add `this.timeout(0);` to avoid timeouts). This allows you to inspect the DOM in your browser to debug tests. You can resume tests by running `resumeTest()` in your browser console.

[More information](https://guides.emberjs.com/v3.28.0/testing/testing-application/#toc_debugging-your-tests)


### Writing tests

When writing tests and not using the `http://localhost:4200/tests` browser tests, it can be easier to have a separate watching build that builds the project for the test environment (this drastically reduces the time you have to wait when running tests):

```bash
yarn build --environment=test -w -o="dist-test"
```

After that, you can easily run tests locally:

Run all tests:

```bash
TZ=UTC yarn test 1 --path="dist-test"
```

To have a cleaner output:

```bash
TZ=UTC yarn test 1 --reporter dot  --path="dist-test"
```

This shows a dot (`.`) for every successful test, and `F` for every failed test. At the end, it will only show the output of the failed tests.

To run a specific test file:
```bash
TZ=UTC yarn test 1 --reporter dot  --path="dist-test" -mp=tests/acceptance/settings/newsletters-test.js
```
_Hint: you can easily copy the path of a test in VSCode by right clicking on the test file and choosing `Copy Relative Path`._

To have a full list of the available options, run
```bash
ember exam --help
```

## Have a bug or issue?

Bugs and issues (even if they only affect the admin app) should be opened on the core [Ghost](https://github.com/tryghost/ghost/issues) repository.

# Copyright & License

Copyright (c) 2013-2022 Ghost Foundation - Released under the [MIT license](LICENSE). Ghost and the Ghost Logo are trademarks of Ghost Foundation Ltd. Please see our [trademark policy](https://ghost.org/trademark/) for info on acceptable usage.
