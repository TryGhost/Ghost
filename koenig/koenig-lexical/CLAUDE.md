# Koenig Lexical Test Guide

## Test Commands

### Unit Tests
```bash
yarn test:unit          # Run unit tests once
yarn test:unit:watch    # Run unit tests in watch mode
```

### E2E Tests (Playwright)
```bash
yarn test:e2e           # Run E2E tests (headless, list reporter)
yarn test:e2e:quiet     # Run E2E tests (minimal output, failures only)
yarn test:e2e:headed    # Run E2E tests with browser UI visible
yarn test:e2e:report    # Run E2E tests with HTML report
yarn test:slowmo        # Run E2E tests with slow motion + UI
```

### All Tests
```bash
yarn test               # Run unit + E2E tests, then lint
```

## AI-Friendly Testing

The test runner has been configured to work well with AI agents:

- **Default behavior**: Headless mode with list reporter (no browser UI, no web pages)
- **Quiet mode**: Use `yarn test:e2e:quiet` for minimal output (only shows failures)
- **Clean exit**: Tests complete without hanging processes or opening browsers
- **Clear output**: List reporter provides clear pass/fail information

## Human-Friendly Testing

For debugging and development:

- Use `yarn test:e2e:headed` to see the browser UI
- Use `yarn test:e2e:report` to generate an HTML report
- Use `yarn test:slowmo` for slow-motion debugging

## Environment Variables

- `PLAYWRIGHT_HEADED=true` - Show browser UI
- `PLAYWRIGHT_HTML_REPORT=true` - Generate HTML report
- `PLAYWRIGHT_SLOWMO=100` - Slow motion delay (ms)

## Test Structure

- `test/unit/` - Unit tests (Vitest)
- `test/e2e/` - End-to-end tests (Playwright)
- `test/utils/` - Shared test utilities

## Development Workflow

1. Run unit tests during development: `yarn test:unit:watch`
2. Run E2E tests before committing: `yarn test:e2e`
3. Use headed mode for debugging: `yarn test:e2e:headed`