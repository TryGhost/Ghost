# Koenig Lexical Test Guide

## Test Commands

### Unit Tests
```bash
pnpm test:unit          # Run unit tests once
pnpm test:unit:watch    # Run unit tests in watch mode
```

### Acceptance Tests (Playwright)
```bash
pnpm test:acceptance           # Run Playwright tests (headless, list reporter)
pnpm test:acceptance:quiet     # Minimal output, failures only
pnpm test:acceptance:headed    # Run with browser UI visible
pnpm test:acceptance:report    # Run with HTML report
pnpm test:slowmo               # Slow motion + UI
```

### All Tests
```bash
pnpm test               # Run unit + acceptance tests, then lint
```

## AI-Friendly Testing

The test runner has been configured to work well with AI agents:

- **Default behavior**: Headless mode with list reporter (no browser UI, no web pages)
- **Quiet mode**: Use `pnpm test:acceptance:quiet` for minimal output (only shows failures)
- **Clean exit**: Tests complete without hanging processes or opening browsers
- **Clear output**: List reporter provides clear pass/fail information

## Human-Friendly Testing

For debugging and development:

- Use `pnpm test:acceptance:headed` to see the browser UI
- Use `pnpm test:acceptance:report` to generate an HTML report
- Use `pnpm test:slowmo` for slow-motion debugging

## Environment Variables

- `PLAYWRIGHT_HEADED=true` - Show browser UI
- `PLAYWRIGHT_HTML_REPORT=true` - Generate HTML report
- `PLAYWRIGHT_SLOWMO=100` - Slow motion delay (ms)

## Test Structure

- `test/unit/` - Unit tests (Vitest)
- `test/e2e/` - Acceptance tests (Playwright, `test:acceptance` target)
- `test/utils/` - Shared test utilities

## Development Workflow

1. Run unit tests during development: `pnpm test:unit:watch`
2. Run acceptance tests before committing: `pnpm test:acceptance`
3. Use headed mode for debugging: `pnpm test:acceptance:headed`
