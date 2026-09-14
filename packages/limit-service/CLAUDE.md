# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Testing
- **Run all tests with coverage**: `pnpm test`
- **Run a specific test file**: `NODE_ENV=testing pnpm vitest run test/limits.test.ts`
- **Run tests matching a pattern**: `NODE_ENV=testing pnpm vitest run -t "MaxLimit"`
- **Run tests with coverage report**: `pnpm test:unit`

### Linting
- **Run ESLint**: `pnpm lint`
- **Fix linting issues**: `pnpm lint --fix`

### Development
- **Note**: There is no dev script currently implemented (placeholder exists)

## High-Level Architecture

The limit-service is a centralized limit enforcement system for Ghost that follows clean architecture principles:

### Core Components

1. **LimitService** (`src/limit-service.ts`): Main service class that acts as a facade for all limit operations. It creates and manages different limit types based on configuration.

2. **Limit Types** (`src/limits.ts`):
   - **MaxLimit**: Enforces maximum counts (e.g., max 5 staff users)
   - **MaxPeriodicLimit**: Enforces limits over time periods (e.g., max emails per month)
   - **FlagLimit**: On/off feature toggles
   - **AllowlistLimit**: Restricts values to an allowed list

3. **Configuration** (`src/config.ts`): Names every limit this package supports. A limit's
   type is not declared, it is inferred from which field is present: `allowlist` makes an
   allowlist limit, `max` a counted one, `maxPeriodic` a counted one that resets each period,
   and a limit with none of those is a flag. Alongside those a limit may specify:
   - `error`: the message to use in place of the generic one, with template variables
   - `currentCountQuery`: how to count what a counted limit measures
   - `formatter`: how to render the count, where a bare number is not what a reader wants

### Key Architectural Patterns

- **Strategy Pattern**: Different limit types implement a common interface (`checkIsOverLimit`, `checkWouldGoOverLimit`)
- **Dependency Injection**: Database connection, errors handler, and configuration are injected at initialization
- **Transaction Support**: All database operations can be wrapped in transactions via `options.transacting`

### Adding New Limits

1. Add the limit configuration in `src/config.ts`:
   ```ts
   newFeature: {
       currentCountQuery: async (knex) => {
           const result = await knex('new_features').count('id', {as: 'count'}).first();
           return result.count;
       }
   }
   ```

   This file declares only how a limit counts. The threshold comes from the host's settings
   at load, and the type is chosen then: `max` or `maxPeriodic` arriving alongside this makes
   it a counted limit, and if neither does it becomes a flag limit and the query above is
   never called. So a limit that should count something needs the host configured to send a
   threshold for it as well as an entry here.

2. Test the new limit following existing patterns in `test/`

### Testing Approach

- Uses Vitest with Node's own `assert` for assertions
- Vitest's mocking for database queries and date/time
- Tests focus on behavior, not implementation
- Mock database responses to test limit logic in isolation

### Database Integration

- Expects a Knex instance for database queries
- All queries support transactions
- Count queries return whatever the driver hands back, which may be a number or text, and
  the comparisons coerce it rather than the query normalising it
- For periodic limits, the query also receives the start of the current period

### Error Handling

- Uses `@tryghost/errors` for consistent error formatting
- Supports template variables in error messages: `{{max}}`, `{{count}}`, `{{name}}`
- All limits have fallback error messages
- Counts in error messages are formatted with `Intl.NumberFormat`, or a limit's own formatter

### Key Methods Flow

1. `loadLimits()`: Initializes the service with configuration
2. `isLimited()`: Checks if a limit is configured
3. `errorIfWouldGoOverLimit()`: Throws if action would exceed limit
4. `errorIfIsOverLimit()`: Throws if already over limit
5. `checkIsOverLimit()`: Returns boolean for limit status
6. `checkWouldGoOverLimit()`: Returns boolean for potential limit breach

### Environment Variable

- Set `NODE_ENV=testing` when running tests