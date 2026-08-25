# AGENTS.md

Read the canonical human documentation before changing this workspace:

- [Writing Browser E2E Tests](../docs/contributing/e2e-testing.md) covers test
  structure, Page Objects, locator priority, waiting, and validation.
- The [E2E workspace README](./README.md) covers infrastructure modes,
  fixtures, isolation, commands, and troubleshooting.
- The [data factory README](./data-factory/README.md) covers test-data helpers.

## Required workflow

- Always use `pnpm`, never npm or Yarn.
- Import shared test helpers through the `@/` aliases documented in the writing
  guide.
- After changing E2E tests, run the focused test, `pnpm lint`, and
  `pnpm test:types` from this workspace.
- After changing the data factory, also run `pnpm build`.
- Update the canonical human guide when a shared E2E convention changes. Do not
  create or rely on tool-specific copies of the guidance.

## Playwright MCP

When discovering selectors or building a Page Object, use Playwright MCP when
it is available:

- Run a focused test with `PRESERVE_ENV=true` and use the instance URL printed
  by the test runner.
- Navigate to that instance and take an accessibility snapshot before choosing
  locators.
- Exercise the interaction to verify the locator and capture a screenshot when
  the rendered state is useful context.
- Follow the locator priority in the E2E writing guide; do not copy generated
  selectors without checking that they are stable.

If Playwright MCP is unavailable, use Playwright Inspector or browser developer
tools as described in the writing guide.
