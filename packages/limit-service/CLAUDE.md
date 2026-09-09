# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Testing

- **Run all tests with coverage**: `npm test`
- **Run a specific test file**: `NODE_ENV=testing mocha './test/limit.test.js'`
- **Run tests matching a pattern**: `NODE_ENV=testing mocha './test/**/*.test.js' --grep "MaxLimit"`
- **Run tests with coverage report**: `NODE_ENV=testing c8 --all --reporter text --reporter cobertura mocha './test/**/*.test.js'`

### Linting

- **Run ESLint**: `npm run lint`
- **Fix linting issues**: `npm run lint -- --fix`

### Development

- **Note**: There is no dev script currently implemented (placeholder exists)

## High-Level Architecture

The limit-service is a centralized limit enforcement system for Ghost that follows clean architecture principles:

### Core Components

1. **LimitService** (`src/limit-service.ts`): A thin facade holding whatever `resolve` returned and answering questions about it. Swapping that result is a single assignment, which is what lets a site's limits change without anything restarting around it.

2. **Limit Types** (`src/limits.ts`):
   - **MaxLimit**: Enforces maximum counts (e.g., max 5 staff users)
   - **MaxPeriodicLimit**: Enforces limits over time periods (e.g., max emails per month)
   - **FlagLimit**: On/off feature toggles
   - **AllowlistLimit**: Restricts values to an allowed list

3. **Resolution** (`src/resolve.ts`): A pure function turning host configuration into limits.
   What each limit is comes from the caller, not from the config, so nothing is guessed:
   - `kinds`: which kind each limit is, declared by the product
   - `counters`: how to count a counted limit, supplied by whoever composes the service
   - `formatters`: how a count should read in a message, where the default will not do

### Key Architectural Patterns

- **Strategy Pattern**: Different limit types implement a common interface (`checkIsOverLimit`, `checkWouldGoOverLimit`)
- **Dependency Injection**: Counters, formatters, errors handler, and configuration are injected at initialization. The package holds no database connection and no knowledge of any product's schema.
- **Transaction Support**: All database operations can be wrapped in transactions via `options.transacting`

### Adding New Limits

1. Declare the limit where the product composing the service declares the others:

   ```javascript
   // what kind of limit it is, declared where the product declares the others
   kinds.newFeature = 'max'; // or 'flag', 'allowlist', 'maxPeriodic'

   // how to count it, alongside the product's other counters
   counters.newFeature = async ({transacting} = {}) => {
       // Return the current count
   };
   ```

2. Test the new limit following existing patterns in `test/`

### Testing Approach

- Uses Mocha with Should.js for assertions
- Sinon for mocking database queries and date/time
- Tests focus on behavior, not implementation
- Mock database responses to test limit logic in isolation

### Database Integration

- Expects a Knex instance for database queries
- All queries support transactions
- Count queries should return a number or be convertible to a number
- For periodic limits, queries receive `startDate` and `endDate` parameters

### Error Handling

- Uses `@tryghost/errors` for consistent error formatting
- Supports template variables in error messages: `{{max}}`, `{{count}}`, `{{name}}`
- All limits have fallback error messages
- Numbers in error messages are formatted with toLocaleString()

### Key Methods Flow

1. `loadLimits()`: Initializes the service with configuration
2. `isLimited()`: Checks if a limit is configured
3. `errorIfWouldGoOverLimit()`: Throws if action would exceed limit
4. `errorIfIsOverLimit()`: Throws if already over limit
5. `checkIsOverLimit()`: Returns boolean for limit status
6. `checkWouldGoOverLimit()`: Returns boolean for potential limit breach

### Environment Variable

- Set `NODE_ENV=testing` when running tests
