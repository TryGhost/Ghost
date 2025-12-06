# Testing Guide

## Quick Reference

```bash
# From root
yarn test:unit                 # Run all unit tests in all packages

# From ghost/core/
yarn test:unit                 # Unit tests only
yarn test:integration          # Integration tests
yarn test:e2e                  # E2E API tests (not browser)
yarn test:browser              # Playwright browser tests for core
yarn test:all                  # All test types
yarn test:single test/unit/path/to/test.test.js  # Single test
```

## E2E Browser Tests

Browser-based E2E tests live in `/e2e/` and use Playwright with Docker isolation.

```bash
# From root
yarn test:e2e                  # Run e2e/ Playwright tests
```

See `e2e/AGENTS.md` for detailed E2E testing patterns, page objects, and conventions.

## Test Organization

| Location | Type | Runner |
|----------|------|--------|
| `ghost/core/test/unit/` | Unit tests | Mocha |
| `ghost/core/test/integration/` | Integration tests | Mocha |
| `ghost/core/test/e2e-api/` | API E2E tests | Mocha |
| `e2e/` | Browser E2E tests | Playwright |
| `apps/*/test/` | App-specific tests | Vitest |

## Troubleshooting

- **E2E failures:** Check `e2e/AGENTS.md` for debugging tips
- **Docker issues:** `yarn docker:clean && yarn docker:build`
