# PR1 Codex Review Prompt

## Context
I've implemented PR1 of a 4-PR series to add email provider adapter support to Ghost CMS. This PR establishes the foundation by creating the base class and registering the adapter type with Ghost's existing AdapterManager system.

## Files Changed (on branch `adapter/email-provider-base`)
1. **`ghost/core/core/server/adapters/email/EmailProviderBase.js`** - New base class
2. **`ghost/core/core/server/services/adapter-manager/index.js`** - Register email adapter type
3. **`ghost/core/test/unit/server/adapters/email/EmailProviderBase.test.js`** - Comprehensive tests

**Note:** These files exist on the PR1 branch, not on main. This PR is the foundation that adds them.

## What to Review

### Architecture
- Does the `EmailProviderBase` class follow Ghost's adapter patterns?
- Compare with existing base classes like `SSOBase` (`ghost/core/core/server/adapters/sso/SSOBase.js`) and `SchedulingBase`
- Is the `requiredFns` approach correct for AdapterManager validation? (Should it use `Object.defineProperty` for immutability like SSOBase does?)
- Is registering the adapter type in `adapter-manager/index.js` the right place?
- Should `requiredFns` be frozen/immutable to prevent tampering?

### Code Quality
- Is the JSDoc documentation clear and complete?
- Does the `send()` method signature match what email providers need?
- Is using `@tryghost/errors.IncorrectUsageError` appropriate for abstract method?
- Are there any missing edge cases in the implementation?

### Testing
- Do the tests validate the adapter contract properly?
- Are there missing test cases?
- Do the tests follow Ghost's testing patterns?
- Is the test coverage adequate for a base class?

### Integration
- Will this work correctly with AdapterManager's discovery mechanism?
- Can adapters in `content/adapters/email/` be loaded?
- Can npm packages like `ghost-email-sendgrid` be discovered?
- Are there any configuration concerns?

### Future-Proofing
- Is the interface extensible for future providers (SES, SendGrid, Postmark)?
- Does this set up PR2 (Mailgun adapter) well?
- Are there any breaking changes to avoid?

## Specific Questions & Answers

### Resolved in PR2:
1. **send() signature**: Separate `data` and `options` parameters confirmed correct - matches SendingService call sites
2. **Provider metadata**: Not needed - adapter name comes from config/AdapterManager
3. **verify() method**: Not added yet - can be optional later if needed, not all providers support sync verification
4. **Ghost conventions**: Following patterns from existing adapters

### Still Open:
1. Should `requiredFns` use `Object.defineProperty` for immutability like `SSOBase` does?
2. Should error imports happen at file top level or inside methods?

## Next Steps
After review, I'll implement PR2 (Mailgun Email Provider Adapter) which will be the first concrete implementation extending this base class.

## Code Snippets

### EmailProviderBase.js (Actual Implementation)
```javascript
const errors = require('@tryghost/errors');

/**
 * Base class for email provider adapters
 *
 * All email provider adapters must extend this class and implement the send() method.
 * Used by AdapterManager to validate adapter contracts.
 */
class EmailProviderBase {
    /**
     * @param {Object} [config] - Adapter configuration
     */
    constructor(config) {
        this.requiredFns = ['send'];
        this.config = config || {};
    }

    /**
     * Send an email using the provider
     *
     * @param {Object} data - Email data (subject, html, plaintext, from, recipients, etc.)
     * @param {Object} options - Send options (tracking, delivery time, etc.)
     * @returns {Promise<{id: string}>} Provider message ID
     */
    async send() {
        throw new errors.IncorrectUsageError({
            message: 'send() must be implemented by email provider adapter'
        });
    }
}

module.exports = EmailProviderBase;
```

**Note:** Error import is at file top-level, following Ghost conventions. The `send()` signature takes `data` and `options` as documented but they're omitted from the base implementation to avoid ESLint unused-vars errors.

### Registration (Line added to adapter-manager/index.js)
```javascript
// After existing adapter registrations:
adapterManager.registerAdapter('storage', require('ghost-storage-base'));
adapterManager.registerAdapter('scheduling', require('../../adapters/scheduling/scheduling-base'));
adapterManager.registerAdapter('sso', require('../../adapters/sso/SSOBase'));
adapterManager.registerAdapter('cache', require('@tryghost/adapter-base-cache'));
adapterManager.registerAdapter('email', require('../../adapters/email/EmailProviderBase')); // ← NEW
```

### Test Coverage
- ✅ Constructor sets requiredFns
- ✅ Constructor stores config
- ✅ Constructor handles missing config
- ✅ send() method exists
- ✅ send() throws error when not implemented
- ✅ Error message is descriptive
- ✅ Can be required by AdapterManager
- ✅ Can be instantiated

## Branch
- **Branch name**: `adapter/email-provider-base`
- **Based on**: `main`
- **Tests**: 8 passing
- **ESLint**: Clean
- **Commit**: d86a7d4b2a

## Files in This PR (via `git diff --name-status main...HEAD`)
```
A   ghost/core/core/server/adapters/email/EmailProviderBase.js
M   ghost/core/core/server/services/adapter-manager/index.js
A   ghost/core/test/unit/server/adapters/email/EmailProviderBase.test.js
```

**Important:** PR2 depends on this PR and builds on the `adapter/email-provider-base` branch.
