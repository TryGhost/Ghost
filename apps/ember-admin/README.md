# Ghost-Admin

This is the home of the Ember.js-based Admin app that ships with [Ghost](https://github.com/tryghost/ghost).

## Test

### Running tests in the browser

Run `pnpm dev` from the repository root, then visit
[http://localhost:4200/tests](http://localhost:4200/tests). The code reloads on
change and the browser runner can filter the tests.

Tip: You can use `this.timeout(0); await this.pauseTest();` in your tests to temporarily pause the execution of browser tests. Use the browser console to inspect and debug the DOM, then resume tests by running `resumeTest()` directly in the browser console ([docs](https://guides.emberjs.com/v3.28.0/testing/testing-application/#toc_debugging-your-tests))

### Running tests in the CLI

Run Ember Admin tests through Nx from the repository root so the required
dependencies are built first:

```bash
pnpm nx run ghost-admin:test
```

To run one file, pass the required parallel value before the Ember Exam
arguments:

```bash
pnpm nx run ghost-admin:test -- 1 \
  --file-path=tests/acceptance/editor/publish-flow-test.js
```

For more detail, see the
[testing guide](../../docs/contributing/testing.md#run-ember-admin-tests).

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](https://github.com/TryGhost/Ghost/blob/main/LICENSE). Ghost and the Ghost Logo are trademarks of Ghost Foundation Ltd. Please see our [trademark policy](https://ghost.org/trademark/) for info on acceptable usage.
