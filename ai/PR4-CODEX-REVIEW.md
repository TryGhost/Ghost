# PR4 Codex Review Prompt

## Context
I've implemented PR4 (final PR) of a 4-PR series to add email adapter support to Ghost CMS. This PR implements email suppression list management as an adapter, creating the foundation for extensible suppression providers and refactoring the existing Mailgun suppression list to use the adapter pattern.

## Files Changed (on branch `adapter/email-suppression`)
1. **`ghost/core/core/server/adapters/email-suppression/EmailSuppressionBase.js`** - New base class for suppression adapters
2. **`ghost/core/core/server/adapters/email-suppression/mailgun/index.js`** - Mailgun suppression adapter implementation
3. **`ghost/core/core/server/services/adapter-manager/index.js`** - Registered email-suppression type + enhanced runtime config support
4. **`ghost/core/core/server/services/adapter-manager/config.js`** - Added email-suppression default config
5. **`ghost/core/core/server/services/email-suppression-list/service.js`** - Updated to use adapter pattern
6. **`ghost/core/test/unit/server/adapters/email-suppression/EmailSuppressionBase.test.js`** - Base class tests (12 passing)
7. **`ghost/core/test/unit/server/adapters/email-suppression/mailgun/index.test.js`** - Mailgun adapter tests (20 passing)

## Files Removed
8. **`ghost/core/core/server/services/email-suppression-list/MailgunEmailSuppressionList.js`** - Legacy implementation removed (single source of truth)
9. **`ghost/core/test/integration/services/mailgun-email-suppression-list.test.js`** - Legacy integration test removed

## What to Review

### Architecture
- Does `EmailSuppressionBase` follow the established adapter pattern from PR1, PR2, & PR3?
- Is the three-method interface (`getSuppressionData`, `getBulkSuppressionData`, `removeEmail`) appropriate for all suppression providers?
- Should the base class include additional optional methods (e.g., `addEmail()`, `verify()`, `sync()`)?
- Is registering `email-suppression` as a separate adapter type (vs `email:suppression`) the right approach?
- Should suppression adapters expose the `init()` method for event subscription, or should that be service-level?

### Mailgun Suppression Adapter
- Does the adapter correctly implement all three required methods?
- Is the dual-removal pattern (API + database) appropriate, or should we separate concerns?
- Should the `removeUnsubscribe()` helper method be part of the base class contract?
- Is error handling (logging + returning false) sufficient, or should we throw/bubble errors?
- Should the adapter inject the Suppression model or always default to `models.Suppression`?

### Runtime Config Pattern
- Is passing `{apiClient}` as runtime config the right approach?
- Should this match the email provider pattern (inject pre-created client)?
- Does the enhanced runtime config support in adapter-manager/index.js handle all use cases?
- Are there any memory leak concerns with singleton adapters holding references?

### Service Wrapper Integration
- Does the adapter integrate cleanly with the email-suppression-list service?
- Should the service expose the adapter directly or wrap it?
- Is the MailgunClient instantiation pattern (at service level) optimal?
- Are there any initialization order concerns with models?

### Event Handling
- Should the `init()` method and DomainEvents subscription be in the adapter or service?
- Is subscribing to EmailBouncedEvent and SpamComplaintEvent at the right level?
- Should event handling be decoupled from the suppression adapter?
- Are there race conditions with event subscription timing?

### Testing
- Do the 32 tests adequately cover suppression functionality?
- Are there missing edge cases (empty lists, concurrent removals, partial failures)?
- Should we add integration tests with the actual service wrapper?
- Is the Suppression model stubbing approach clean and maintainable?

### Backward Compatibility
- Does this maintain full compatibility with existing suppression list functionality?
- Will existing Ghost installations work without changes?
- Are all Mailgun suppression features preserved?
- Is the bounce/spam processing pipeline unchanged?

## Specific Questions

1. **Bulk operations**: Should `getBulkSuppressionData()` have a batch size limit to prevent large queries?
2. **Return values**: Should `removeEmail()` return detailed success/failure info instead of boolean?
3. **Reason mapping**: Is the `bounce` → `fail` reason conversion correct and consistent?
4. **Database vs API**: Should we support suppression providers that only use database OR only use API?
5. **Multiple providers**: If we support multiple suppression providers, how should data be merged?
6. **Init pattern**: Should `init()` be called automatically by AdapterManager, or manually by the service?

## Code Snippets

### EmailSuppressionBase
```javascript
class EmailSuppressionBase {
    constructor(config) {
        Object.defineProperty(this, 'requiredFns', {
            value: ['getSuppressionData', 'getBulkSuppressionData', 'removeEmail'],
            writable: false
        });
        this.config = config || {};
    }

    async getSuppressionData() {
        throw new errors.IncorrectUsageError({
            message: 'getSuppressionData() must be implemented by email suppression adapter'
        });
    }

    async getBulkSuppressionData() {
        throw new errors.IncorrectUsageError({
            message: 'getBulkSuppressionData() must be implemented by email suppression adapter'
        });
    }

    async removeEmail() {
        throw new errors.IncorrectUsageError({
            message: 'removeEmail() must be implemented by email suppression adapter'
        });
    }
}
```

### Mailgun Suppression Adapter
```javascript
class MailgunEmailSuppressionAdapter extends EmailSuppressionBase {
    #apiClient;
    #Suppression;

    constructor(config) {
        super(config);
        if (!config.apiClient) {
            throw new errors.IncorrectUsageError({
                message: 'Mailgun suppression adapter requires apiClient'
            });
        }
        this.#apiClient = config.apiClient;
        this.#Suppression = config.Suppression || models.Suppression;
    }

    async removeEmail(email) {
        try {
            await this.#apiClient.removeBounce(email);
            await this.#apiClient.removeComplaint(email);
            await this.#apiClient.removeUnsubscribe(email);
        } catch (err) {
            logging.error(err);
            return false;
        }

        try {
            await this.#Suppression.destroy({
                destroyBy: { email: email }
            });
        } catch (err) {
            logging.error(err);
            return false;
        }

        return true;
    }

    async getSuppressionData(email) {
        try {
            const model = await this.#Suppression.findOne({ email: email });
            if (!model) {
                return new EmailSuppressionData(false);
            }
            return new EmailSuppressionData(true, {
                timestamp: model.get('created_at'),
                reason: model.get('reason') === 'spam' ? 'spam' : 'fail'
            });
        } catch (err) {
            logging.error(err);
            return new EmailSuppressionData(false);
        }
    }

    async getBulkSuppressionData(emails) {
        if (emails.length === 0) {
            return [];
        }
        try {
            const collection = await this.#Suppression.findAll({
                filter: `email:[${emails.map(email => `'${email}'`).join(',')}]`
            });
            return emails.map((email) => {
                const model = collection.models.find(m => m.get('email') === email);
                if (!model) {
                    return new EmailSuppressionData(false);
                }
                return new EmailSuppressionData(true, {
                    timestamp: model.get('created_at'),
                    reason: model.get('reason') === 'spam' ? 'spam' : 'fail'
                });
            });
        } catch (err) {
            logging.error(err);
            return emails.map(() => new EmailSuppressionData(false));
        }
    }

    async init() {
        const handleEvent = reason => async (event) => {
            try {
                if (reason === 'bounce') {
                    if (!Number.isInteger(event.error?.code)) {
                        return;
                    }
                    if (event.error.code !== 607 && event.error.code !== 605) {
                        return;
                    }
                }
                await this.#Suppression.add({
                    email: event.email,
                    email_id: event.emailId,
                    reason: reason,
                    created_at: event.timestamp
                });
                DomainEvents.dispatch(EmailSuppressedEvent.create({
                    emailAddress: event.email,
                    emailId: event.emailId,
                    reason: reason
                }, event.timestamp));
            } catch (err) {
                if (err.code !== 'ER_DUP_ENTRY') {
                    logging.error(err);
                }
            }
        };
        DomainEvents.subscribe(EmailBouncedEvent, handleEvent('bounce'));
        DomainEvents.subscribe(SpamComplaintEvent, handleEvent('spam'));
    }
}
```

### Runtime Config Injection (Enhanced)
```javascript
// adapter-manager/index.js
getAdapter(name, runtimeConfig) {
    const adapterServiceConfig = getAdapterServiceConfig(config);
    const {adapterClassName, adapterConfig} = resolveAdapterOptions(name, adapterServiceConfig);

    // Merge runtime config if provided (for dependency injection)
    const finalConfig = runtimeConfig ? Object.assign({}, adapterConfig, runtimeConfig) : adapterConfig;

    return adapterManager.getAdapter(name, adapterClassName, finalConfig);
}

// email-suppression-list/service.js
const mailgunClient = new MailgunClient({
    config: configService,
    settings: settingsCache
});

module.exports = adapterManager.getAdapter('email-suppression', {
    apiClient: mailgunClient
});
```

### Default Configuration
```javascript
// adapter-manager/config.js
if (!adapterServiceConfig['email-suppression']) {
    adapterServiceConfig['email-suppression'] = {
        active: 'mailgun',
        mailgun: {}
    };
}
```

## Test Coverage
- ✅ Constructor validates apiClient presence
- ✅ Extends EmailSuppressionBase
- ✅ removeEmail() calls all API methods (bounce, complaint, unsubscribe)
- ✅ removeEmail() removes from database
- ✅ removeEmail() handles API failures
- ✅ removeEmail() handles database failures
- ✅ removeUnsubscribe() helper method
- ✅ getSuppressionData() returns not suppressed when not found
- ✅ getSuppressionData() returns suppression info when found
- ✅ Reason mapping (bounce → fail, spam → spam)
- ✅ getSuppressionData() handles database errors
- ✅ getBulkSuppressionData() handles empty input
- ✅ getBulkSuppressionData() returns data for multiple emails
- ✅ getBulkSuppressionData() builds correct filter query
- ✅ getBulkSuppressionData() handles database errors
- ✅ Adapter contract compliance (requiredFns)
- ✅ Has init() method for event subscription
- ✅ Base class immutable requiredFns

## Branch
- **Branch name**: `adapter/email-suppression`
- **Based on**: `main`
- **Tests**: 32 passing (12 base + 20 Mailgun)
- **ESLint**: Clean (with justified filename override)
- **Commit**: 5ac98ee709

## Technical Notes

**Module Resolution**: Filename must be `index.js` for AdapterManager to resolve `require('email-suppression/mailgun')` correctly.

**Runtime Config Enhancement**: Enhanced the adapter-manager/index.js `getAdapter()` method to support optional runtime config merging, enabling dependency injection pattern across all adapter types (email, email-analytics, email-suppression).

**Dual-Layer Removal**: The adapter removes emails from both Mailgun API (bounce/complaint/unsubscribe lists) and local database (Suppression model) to maintain consistency.

**Event Subscription**: The `init()` method subscribes to DomainEvents (EmailBouncedEvent, SpamComplaintEvent) and automatically adds suppressions. This preserves the existing event-driven architecture.

**Error Handling**: Methods return false on errors rather than throwing, allowing graceful degradation. Errors are logged for debugging.

**Reason Mapping**: Database stores 'bounce' but API returns 'fail' for consistency with EmailSuppressionData interface.

**Bulk Query Optimization**: `getBulkSuppressionData()` uses single database query with filter instead of N queries, improving performance for bulk checks.

## Files in This PR (via `git diff --name-status main...HEAD`)
```
A   ghost/core/core/server/adapters/email-suppression/EmailSuppressionBase.js
A   ghost/core/core/server/adapters/email-suppression/mailgun/index.js
M   ghost/core/core/server/services/adapter-manager/config.js
M   ghost/core/core/server/services/adapter-manager/index.js
D   ghost/core/core/server/services/email-suppression-list/MailgunEmailSuppressionList.js
M   ghost/core/core/server/services/email-suppression-list/service.js
D   ghost/core/test/integration/services/mailgun-email-suppression-list.test.js
A   ghost/core/test/unit/server/adapters/email-suppression/EmailSuppressionBase.test.js
A   ghost/core/test/unit/server/adapters/email-suppression/mailgun/index.test.js
```

## Series Complete
This is the **final PR (4/4)** in the email adapter series:
- ✅ PR1: Email Provider Base Class (8 tests)
- ✅ PR2: Mailgun Email Provider Adapter (31 tests)
- ✅ PR3: Email Analytics Adapter (24 tests)
- ✅ PR4: Email Suppression Adapter (32 tests)

**Total**: 95 tests passing across all 4 PRs, providing comprehensive coverage for the new adapter architecture.

All PRs are ready for submission and establish the foundation for adding alternative email providers (SendGrid, SES, Postmark, etc.).
