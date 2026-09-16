# Koenig Lexical agent guidance

Read the [`README.md`](./README.md), especially its development, testing, and
editor-integration sections, before changing this package.

## Required workflow

- Always use `pnpm`.
- These Playwright tests are package-level acceptance tests. Ghost's browser
  E2E suite lives in the repository-level `e2e/` workspace.
- Use `pnpm test:unit:watch` for focused unit-test development and
  `pnpm test:acceptance:quiet` when concise acceptance-test output is useful.
- Run the relevant focused tests while iterating, then run `pnpm test` and
  `pnpm lint` before submitting changes.

## AI-Friendly Testing

The test runner has been configured to work well with AI agents:

- **Default behavior**: Headless mode with list reporter (no browser UI, no web pages)
- **Quiet mode**: Use `pnpm test:acceptance:quiet` for minimal output (only shows failures)
- **Clean exit**: Tests complete without hanging processes or opening browsers
- **Clear output**: List reporter provides clear pass/fail information

- Use `pnpm test:acceptance:headed`, `pnpm test:acceptance --ui`, or
  `pnpm test:slowmo` only when interactive debugging is useful; do not leave a
  browser or report server running after validation.
- Update the README when the package's shared commands or testing workflow
  changes; do not duplicate that guidance here.
