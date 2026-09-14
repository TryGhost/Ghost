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

1. **LimitService** (`lib/LimitService.js`): Main service class that acts as a facade for all limit operations. It creates and manages different limit types based on configuration.

2. **Limit Types** (`lib/limit.js`):
   - **MaxLimit**: Enforces maximum counts (e.g., max 5 staff users)
   - **MaxPeriodicLimit**: Enforces limits over time periods (e.g., max emails per month)
   - **FlagLimit**: On/off feature toggles
   - **AllowlistLimit**: Restricts values to an allowed list

3. **Configuration** (`lib/config.js`): Defines supported limits and their properties. Each limit can specify:
   - `type`: The limit type to use
   - `fallbackErrorMessage`: Default error message
   - `currentCountQuery`: Database query function for count-based limits

### Key Architectural Patterns

- **Strategy Pattern**: Different limit types implement a common interface (`checkIsOverLimit`, `checkWouldGoOverLimit`)
- **Dependency Injection**: Database connection, errors handler, and configuration are injected at initialization
- **Transaction Support**: All database operations can be wrapped in transactions via `options.transacting`

### Adding New Limits

1. Add the limit configuration in `lib/config.js`:
   ```javascript
   newFeature: {
       type: 'max', // or 'flag', 'allowlist'
       fallbackErrorMessage: 'Default error for {{name}} limit',
       currentCountQuery: async (db, options) => {
           // Return current count from database
       }
   }
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