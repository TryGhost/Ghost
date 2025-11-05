# PR2 Codex Review Prompt

## Context
I've implemented PR2 of a 4-PR series to add email provider adapter support to Ghost CMS. This PR implements the Mailgun adapter as the first concrete implementation extending EmailProviderBase from PR1, and includes critical fixes for adapter loading, caching, and removing legacy code.

## Files Changed
1. **`ghost/core/core/server/adapters/email/mailgun/index.js`** - Mailgun adapter implementation (renamed from MailgunEmailProvider.js for proper module resolution)
2. **`ghost/core/core/server/services/adapter-manager/index.js`** - Added runtime config injection support with cache clearing
3. **`ghost/core/core/server/services/adapter-manager/config.js`** - Added email adapter default config
4. **`ghost/core/core/server/services/email-service/EmailServiceWrapper.js`** - Updated to use adapter pattern
5. **`ghost/core/test/unit/server/adapters/email/mailgun/index.test.js`** - Comprehensive adapter tests (23 passing)

## Files Removed (Critical!)
6. **`ghost/core/core/server/services/email-service/MailgunEmailProvider.js`** - Legacy provider removed (single source of truth)
7. **`ghost/core/test/unit/server/services/email-service/mailgun-email-provider.test.js`** - Legacy tests removed

## What to Review

### Architecture
- Does the Mailgun adapter correctly extend EmailProviderBase?
- Is the runtime config injection pattern in AdapterManager clean and maintainable?
- Does EmailServiceWrapper properly integrate with AdapterManager?
- Is the config defaulting to 'mailgun' appropriate?
- Will this pattern work for future email providers (SendGrid, SES, Postmark)?

### Dependency Injection & Caching (CRITICAL FIXES)
- **Module Resolution**: Is `index.js` the correct filename for AdapterManager to find the adapter via `require('email/mailgun')`?
- **Runtime Config**: Is passing `mailgunClient` instance through runtime config the right approach?
- **Cache Clearing**: Does clearing the adapter cache when runtime config is provided prevent stale dependency issues?
- **Single Source of Truth**: Was removing the legacy `MailgunEmailProvider.js` and tests the correct approach?
- Should MailgunClient creation move inside the adapter instead?
- Are there any circular dependency concerns?

### Code Quality
- Is the MailgunEmailProvider implementation clean and maintainable?
- Are private class fields (#mailgunClient, #errorHandler) used appropriately?
- Is the ESLint `max-lines` override justified for the adapter?
- Does the error handling follow Ghost's patterns?
- Are the logging statements appropriate?

### Testing
- Do the 23 tests adequately cover the Mailgun adapter functionality?
- Are there missing edge cases?
- Do the tests properly mock MailgunClient?
- Should we add integration tests with AdapterManager?
- Is the test coverage adequate?

### Backward Compatibility
- Does this maintain full compatibility with existing Mailgun functionality?
- Will existing Ghost installations continue to work without config changes?
- Are all Mailgun features preserved (batch sending, recipient variables, scheduling)?
- Is error handling equivalent to the original implementation?

### Performance
- Is there any performance impact from using AdapterManager vs direct instantiation?
- Does AdapterManager caching work correctly for email adapters?
- Are there any memory leak concerns with the singleton pattern?

### Integration Points
- Will adapter discovery work for custom adapters in `content/adapters/email/`?
- Can npm packages like `ghost-email-sendgrid` be loaded?
- Does the adapter work correctly with SendingService and BatchSendingService?
- Are there any concerns with the initialization sequence in EmailServiceWrapper?

## Specific Questions
1. Should runtime config injection be a separate method instead of an optional parameter?
2. Is the config defaulting behavior appropriate, or should it be more explicit?
3. Should we validate that the adapter extends EmailProviderBase at runtime?
4. Are there any missing adapter methods that future providers might need?
5. Should getMaximumRecipients() and getTargetDeliveryWindow() be in the base class interface?

## Code Snippets

### Mailgun Adapter
```javascript
class MailgunEmailProvider extends EmailProviderBase {
    #mailgunClient;
    #errorHandler;

    constructor(config) {
        super(config);
        if (!config.mailgunClient) {
            throw new errors.IncorrectUsageError({
                message: 'Mailgun adapter requires mailgunClient in config'
            });
        }
        this.#mailgunClient = config.mailgunClient;
        this.#errorHandler = config.errorHandler;
    }

    async send(data, options) {
        // Full Mailgun implementation
        // Handles recipient data, variable replacement, API calls
    }

    getMaximumRecipients() {
        return this.#mailgunClient.getBatchSize();
    }

    getTargetDeliveryWindow() {
        return this.#mailgunClient.getTargetDeliveryWindow();
    }
}
```

### Runtime Config Injection with Encapsulated Cache Clearing
```javascript
// adapter-manager/AdapterManager.js - New method for proper encapsulation
resetCacheFor(adapterType) {
    if (this.instanceCache[adapterType]) {
        this.instanceCache[adapterType] = {};
    }
}

// adapter-manager/index.js - Uses resetCacheFor() instead of direct access
getAdapter(name, runtimeConfig) {
    const adapterServiceConfig = getAdapterServiceConfig(config);
    const {adapterClassName, adapterConfig} = resolveAdapterOptions(name, adapterServiceConfig);

    // Merge runtime config with file-based config
    const finalConfig = runtimeConfig ? Object.assign({}, adapterConfig, runtimeConfig) : adapterConfig;

    // When runtime config is provided, clear cache to ensure fresh instance with new dependencies
    // Uses resetCacheFor() to maintain encapsulation vs direct instanceCache access
    if (runtimeConfig) {
        const adapterType = name.includes(':') ? name.split(':')[0] : name;
        adapterManager.resetCacheFor(adapterType);
    }

    return adapterManager.getAdapter(name, adapterClassName, finalConfig);
}
```

### EmailServiceWrapper Integration
```javascript
// Create MailgunClient instance
const mailgunClient = new MailgunClient({
    config: configService, settings: settingsCache
});

// Get adapter from AdapterManager with runtime dependencies
const mailgunEmailProvider = adapterManager.getAdapter('email', {
    mailgunClient,
    errorHandler
});
```

### Default Configuration
```javascript
// adapter-manager/config.js
if (!adapterServiceConfig.email) {
    adapterServiceConfig.email = {
        active: 'mailgun',
        mailgun: {}
    };
}
```

## Test Coverage
- ✅ Constructor validates mailgunClient presence
- ✅ Constructor stores dependencies
- ✅ Extends EmailProviderBase
- ✅ send() calls Mailgun API correctly
- ✅ Message data formatting
- ✅ Recipient variable replacement ({{token}} → %recipient.token%)
- ✅ Recipient data structure
- ✅ Tracking options (open/click)
- ✅ Delivery time scheduling
- ✅ Message ID trimming
- ✅ Error handling and EmailError creation
- ✅ Error handler invocation
- ✅ Generic error handling
- ✅ Error message truncation
- ✅ getMaximumRecipients()
- ✅ getTargetDeliveryWindow()
- ✅ Adapter contract compliance

## Branch
- **Branch name**: `adapter/email-provider-mailgun`
- **Based on**: `adapter/email-provider-base` (PR1)
- **Tests**: 31 passing total (23 adapter tests + 8 AdapterManager tests including 2 new resetCacheFor tests)
- **ESLint**: Clean (with justified max-lines override)
- **Commit**: a8492d8e63

## Critical Fixes Applied
1. **Module Resolution**: Renamed `MailgunEmailProvider.js` → `index.js` so AdapterManager can load via `require('email/mailgun')`
2. **Removed Legacy Code**: Deleted old `services/email-service/MailgunEmailProvider.js` and its tests (single source of truth)
3. **Cache Clearing with Proper Encapsulation**: Added `resetCacheFor(type)` method to AdapterManager instead of direct instanceCache access
4. **Safeguard for Unknown Types**: resetCacheFor() throws NotFoundError for unregistered types (matches getAdapter pattern)
5. **Comprehensive Testing**: Added 2 tests for resetCacheFor() behavior
6. **File Paths**: All paths use full `ghost/core/core/server/` prefix for accuracy

## Next Steps
After review, I'll implement PR3 (Email Analytics Adapter) which will create adapters for email analytics providers.
