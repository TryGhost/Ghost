# PR3 Codex Review Prompt

## Context
I've implemented PR3 of a 4-PR series to add email adapter support to Ghost CMS. This PR implements email analytics as an adapter, creating the foundation for extensible analytics providers and refactoring the existing Mailgun analytics to use the adapter pattern.

## Files Changed (on branch `adapter/email-analytics`)
1. **`ghost/core/core/server/adapters/email-analytics/EmailAnalyticsBase.js`** - New base class for analytics adapters
2. **`ghost/core/core/server/adapters/email-analytics/mailgun/index.js`** - Mailgun analytics adapter implementation
3. **`ghost/core/core/server/services/adapter-manager/index.js`** - Registered email-analytics type + runtime config support
4. **`ghost/core/core/server/services/adapter-manager/config.js`** - Added email-analytics default config
5. **`ghost/core/core/server/services/email-analytics/EmailAnalyticsServiceWrapper.js`** - Updated to use adapter pattern
6. **`ghost/core/test/unit/server/adapters/email-analytics/EmailAnalyticsBase.test.js`** - Base class tests (7 passing)
7. **`ghost/core/test/unit/server/adapters/email-analytics/mailgun/index.test.js`** - Mailgun adapter tests (17 passing)

## Files Removed
8. **`ghost/core/core/server/services/email-analytics/EmailAnalyticsProviderMailgun.js`** - Legacy provider removed (single source of truth)

## What to Review

### Architecture
- Does `EmailAnalyticsBase` follow the established adapter pattern from PR1 & PR2?
- Is the `fetchLatest()` interface appropriate for all analytics providers?
- Should the base class include additional optional methods (e.g., `getStats()`, `verify()`)?
- Is registering `email-analytics` as a separate adapter type (vs `email:analytics`) the right approach?

### Mailgun Analytics Adapter
- Does the adapter correctly implement the `fetchLatest()` contract?
- Is the event filtering logic (delivered, opened, failed, unsubscribed, complained) properly handled?
- Are Date-to-Unix-timestamp conversions correct?
- Does the tag handling (default + custom tags) work as expected?
- Should MailgunClient be injected instead of created internally?

### Runtime Config Pattern
- Is passing `{config, settings}` as runtime config the right approach?
- Should this match the email provider pattern (inject pre-created client)?
- Is the config/settings distinction clear and necessary?
- Are there any memory leak concerns with service singletons?

### EmailAnalyticsServiceWrapper Integration
- Does the adapter integrate cleanly with EmailAnalyticsService?
- Is the provider array pattern still appropriate (supports multiple providers)?
- Should we support multiple analytics adapters simultaneously?
- Are there any initialization order concerns?

### Testing
- Do the 24 tests adequately cover analytics functionality?
- Are there missing edge cases (no events, pagination, errors)?
- Should we add integration tests with EmailAnalyticsService?
- Is the MailgunClient stubbing approach clean and maintainable?

### Backward Compatibility
- Does this maintain full compatibility with existing analytics?
- Will existing Ghost installations work without changes?
- Are all Mailgun analytics features preserved?
- Is the event processing pipeline unchanged?

## Specific Questions

1. **fetchLatest() signature**: Should we add a return value (event count) or keep it void?
2. **Batch processing**: Is the batchHandler callback pattern optimal for all providers?
3. **Event types**: Should event types be an enum/constant instead of strings?
4. **Provider configuration**: Should providers have their own config section (e.g., `adapters:email-analytics:mailgun:apiKey`)?
5. **Multiple providers**: If we support multiple analytics providers, how should events be deduplicated?

## Code Snippets

### EmailAnalyticsBase
```javascript
class EmailAnalyticsBase {
    constructor(config) {
        this.requiredFns = ['fetchLatest'];
        this.config = config || {};
    }

    /**
     * @param {Function} batchHandler - Called with array of events
     * @param {Object} options
     * @param {Date} options.begin - Start timestamp
     * @param {Date} options.end - End timestamp
     * @param {number} [options.maxEvents] - Max events to fetch
     * @param {string[]} [options.events] - Event types to fetch
     */
    async fetchLatest() {
        throw new errors.IncorrectUsageError({
            message: 'fetchLatest() must be implemented by email analytics provider adapter'
        });
    }
}
```

### Mailgun Analytics Adapter
```javascript
class MailgunEmailAnalyticsProvider extends EmailAnalyticsBase {
    #mailgunClient;
    #tags;

    constructor(config) {
        super(config);
        this.#mailgunClient = new MailgunClient({
            config: config.config,
            settings: config.settings
        });
        this.#tags = [...DEFAULT_TAGS];
    }

    async fetchLatest(batchHandler, options) {
        const mailgunOptions = {
            limit: PAGE_LIMIT,
            event: options?.events ? options.events.join(' OR ') : DEFAULT_EVENT_FILTER,
            tags: this.#tags.join(' AND '),
            begin: options.begin ? options.begin.getTime() / 1000 : undefined,
            end: options.end ? options.end.getTime() / 1000 : undefined,
            ascending: 'yes'
        };

        return this.#fetchAnalytics(mailgunOptions, batchHandler, {
            maxEvents: options.maxEvents
        });
    }
}
```

### Runtime Config Injection
```javascript
// EmailAnalyticsServiceWrapper
const mailgunAnalyticsProvider = adapterManager.getAdapter('email-analytics', {
    config,      // Ghost config service
    settings     // Ghost settings cache
});
```

### Default Configuration
```javascript
// adapter-manager/config.js
if (!adapterServiceConfig['email-analytics']) {
    adapterServiceConfig['email-analytics'] = {
        active: 'mailgun',
        mailgun: {}
    };
}
```

## Test Coverage
- ✅ Constructor validates config/settings presence
- ✅ Extends EmailAnalyticsBase
- ✅ fetchLatest() calls Mailgun client correctly
- ✅ Date-to-Unix timestamp conversion
- ✅ Event type filtering
- ✅ Custom tag configuration
- ✅ Default event filter
- ✅ batchHandler passing
- ✅ maxEvents option handling
- ✅ Optional begin/end timestamps
- ✅ Adapter contract compliance
- ✅ requiredFns validation

## Branch
- **Branch name**: `adapter/email-analytics`
- **Based on**: `main`
- **Tests**: 24 passing (7 base + 17 Mailgun)
- **ESLint**: Clean (with justified filename override)
- **Commit**: 95edc1b817

## Technical Notes

**Module Resolution**: Filename must be `index.js` for AdapterManager to resolve `require('email-analytics/mailgun')` correctly.

**Runtime Config**: Unlike email provider (which injects mailgunClient), analytics adapter receives `{config, settings}` and creates its own MailgunClient internally. This maintains the existing pattern from EmailAnalyticsProviderMailgun.

**Event Processing**: The adapter only fetches events. Processing is handled by EmailEventProcessor (unchanged from original implementation).

**Pagination**: PAGE_LIMIT of 300 events per batch matches Mailgun API recommendations.

## Files in This PR (via `git diff --name-status main...HEAD`)
```
A   ghost/core/core/server/adapters/email-analytics/EmailAnalyticsBase.js
A   ghost/core/core/server/adapters/email-analytics/mailgun/index.js
M   ghost/core/core/server/services/adapter-manager/config.js
M   ghost/core/core/server/services/adapter-manager/index.js
D   ghost/core/core/server/services/email-analytics/EmailAnalyticsProviderMailgun.js
M   ghost/core/core/server/services/email-analytics/EmailAnalyticsServiceWrapper.js
A   ghost/core/test/unit/server/adapters/email-analytics/EmailAnalyticsBase.test.js
A   ghost/core/test/unit/server/adapters/email-analytics/mailgun/index.test.js
```

## Next Steps
After review, I'll implement PR4 (Email Suppression Adapter) which will create adapters for email suppression list management.
