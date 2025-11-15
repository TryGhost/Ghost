# Email Adapter Implementation - Master Plan

**Status:** 🟢 IN PROGRESS (PR1 ✅ | PR2 ✅ | PR3 ✅ | PR4 🔜)
**Approach:** Fresh start with Ghost's AdapterManager system
**Last Updated:** 2025-10-25

---

## 📋 Executive Summary

We're implementing email provider support using Ghost's existing AdapterManager architecture instead of a custom factory pattern. This provides:
- ✅ Community extensibility from day 1
- ✅ Architectural consistency with storage/cache/scheduling/SSO
- ✅ Built-in validation and discovery
- ✅ No future migration needed

**Why now?** Nothing is shipped yet - this is the perfect time to get the architecture right.

---

## 🎯 Goals

1. **Enable multi-provider email support** - Mailgun today, community providers tomorrow
2. **Use Ghost's AdapterManager** - Proven pattern, no custom code
3. **Ship incrementally** - Small, reviewable PRs that build on each other
4. **Avoid branch contamination** - Each PR is self-contained
5. **Test thoroughly** - All tests pass first time

---

## 📦 What We're Building

### Three Adapter Types

1. **Email Provider Adapters** (`adapters:email`)
   - Sends bulk emails
   - First implementation: Mailgun
   - Future: SendGrid, SES, Postmark, Brevo, Resend (community)

2. **Email Analytics Adapters** (`adapters:email-analytics`)
   - Fetches email events (opens, clicks, bounces)
   - Maps to email provider (Mailgun analytics for Mailgun emails)
   - Future: Provider-specific analytics implementations

3. **Email Suppression Adapters** (`adapters:email-suppression`)
   - Manages suppression lists (bounced/unsubscribed emails)
   - Provider-specific implementations (Mailgun suppression API)
   - Fallback: InMemoryEmailSuppressionList

---

## 🗂️ PR Series Structure

### PR1: Create Email Provider Base Class & Register Type ✅ COMPLETE
**Branch:** `adapter/email-provider-base` (from `main`)
**Commit:** `d86a7d4b2a`
**Purpose:** Foundation - register email adapter type with AdapterManager
**Changes:**
- ✅ Created `ghost/core/core/server/adapters/email/EmailProviderBase.js`
- ✅ Registered adapter type in `ghost/core/core/server/services/adapter-manager/index.js`
- ✅ Added tests validating base class contract (8 passing tests)
- ℹ️  Config support added in PR2 (default email adapter config)

**Why first?** Must register adapter type before we can use it.

---

### PR2: Implement Mailgun Email Provider Adapter ✅ COMPLETE
**Branch:** `adapter/email-provider-mailgun` (from `adapter/email-provider-base`)
**Commit:** `a8492d8e63`
**Purpose:** Refactor existing MailgunEmailProvider to extend base class
**Changes:**
- ✅ Moved `MailgunEmailProvider` to `ghost/core/core/server/adapters/email/mailgun/index.js`
- ✅ Extended `EmailProviderBase` with full Mailgun implementation
- ✅ Added `requiredFns` validation
- ✅ Updated `EmailServiceWrapper` to use AdapterManager with runtime config injection
- ✅ Enhanced AdapterManager to support runtime dependency injection
- ✅ Added resetCacheFor() method to AdapterManager for proper encapsulation
- ✅ Added safeguard to resetCacheFor() that throws for unknown adapter types
- ✅ Fixed caching to handle runtime config properly
- ✅ Removed legacy MailgunEmailProvider from services/email-service/
- ✅ Comprehensive test coverage (23 adapter tests + 8 AdapterManager tests = 31 total)
- ✅ Added default email adapter config (defaults to mailgun)

**Why second?** Need base class (PR1) before implementing adapter.

---

### PR3: Create Email Analytics Base & Mailgun Implementation ✅ COMPLETE
**Branch:** `adapter/email-analytics` (from `main`)
**Commit:** `95edc1b817`
**Purpose:** Analytics adapters for email event tracking
**Changes:**
- ✅ Created `ghost/core/core/server/adapters/email-analytics/EmailAnalyticsBase.js`
- ✅ Registered 'email-analytics' adapter type in AdapterManager
- ✅ Implemented `ghost/core/core/server/adapters/email-analytics/mailgun/index.js`
- ✅ Updated `EmailAnalyticsServiceWrapper` to use AdapterManager with runtime config
- ✅ Removed legacy EmailAnalyticsProviderMailgun from services/email-analytics/
- ✅ Added runtime config injection support to AdapterManager
- ✅ Added default email-analytics adapter configuration (defaults to Mailgun)
- ✅ Comprehensive test coverage (24 tests: 7 base + 17 Mailgun)

**Why third?** Independent of PR2, but builds on adapter pattern.

---

### PR4: Create Email Suppression Base & Mailgun Implementation
**Branch:** `adapter/email-suppression` (from `main`)
**Purpose:** Suppression list adapters
**Changes:**
- Create `core/server/adapters/email-suppression/EmailSuppressionBase.js`
- Register adapter type in AdapterManager
- Implement `core/server/adapters/email-suppression/mailgun/index.js`
- Keep `InMemoryEmailSuppressionList` as fallback
- Update suppression service to use AdapterManager
- Comprehensive tests

**Why fourth?** Complete the adapter foundation.

---

## 🏗️ Architecture Deep Dive

### Base Class Pattern

```javascript
// core/server/adapters/email/EmailProviderBase.js
class EmailProviderBase {
    constructor(config) {
        // Set required methods that all providers must implement
        this.requiredFns = ['send'];
        this.config = config;
    }

    /**
     * @abstract
     * Send an email
     * @param {EmailData} data - Email content and recipients
     * @returns {Promise<EmailProviderSuccessResponse>}
     */
    async send(data) {
        throw new Error('send() must be implemented by email provider');
    }
}

module.exports = EmailProviderBase;
```

### Adapter Implementation Pattern

```javascript
// core/server/adapters/email/mailgun/index.js
const EmailProviderBase = require('../EmailProviderBase');
const MailgunClient = require('../../services/lib/MailgunClient');

class MailgunEmailProvider extends EmailProviderBase {
    #mailgunClient;
    #errorHandler;

    constructor(config) {
        super(config);
        this.#mailgunClient = new MailgunClient(config);
        this.#errorHandler = config.errorHandler;
    }

    async send(data) {
        try {
            const result = await this.#mailgunClient.send(data);
            return { id: result.id };
        } catch (error) {
            if (this.#errorHandler) {
                this.#errorHandler(error);
            }
            throw error;
        }
    }
}

module.exports = MailgunEmailProvider;
```

### Registration Pattern

```javascript
// core/server/services/adapter-manager/index.js

// Register email adapter types
adapterManager.registerAdapter('email', require('../../adapters/email/EmailProviderBase'));
adapterManager.registerAdapter('email-analytics', require('../../adapters/email-analytics/EmailAnalyticsBase'));
adapterManager.registerAdapter('email-suppression', require('../../adapters/email-suppression/EmailSuppressionBase'));
```

### Usage Pattern

```javascript
// core/server/services/email-service/EmailServiceWrapper.js
const adapterManager = require('../adapter-manager');

class EmailServiceWrapper {
    init() {
        // Get email provider via adapter manager
        const emailProvider = adapterManager.getAdapter('email');

        // Rest of initialization...
        const emailService = new EmailService({
            emailProvider,
            // ... other dependencies
        });

        this.service = emailService;
    }
}
```

### Configuration Pattern

```json
{
  "adapters": {
    "email": {
      "active": "mailgun",
      "mailgun": {
        "domain": "mg.example.com",
        "apiKey": "key-xxx",
        "baseUrl": "https://api.mailgun.net"
      }
    },
    "email-analytics": {
      "active": "mailgun",
      "mailgun": {
        "domain": "mg.example.com",
        "apiKey": "key-xxx"
      }
    },
    "email-suppression": {
      "active": "mailgun",
      "mailgun": {
        "domain": "mg.example.com",
        "apiKey": "key-xxx"
      }
    }
  }
}
```

---

## 🔄 Backward Compatibility Strategy

### Config Migration Helper

```javascript
// core/server/services/adapter-manager/config.js

function getEmailAdapterConfig(config) {
    // NEW: adapters:email (preferred)
    if (config.get('adapters:email')) {
        return config.get('adapters:email');
    }

    // OLD: bulkEmail:provider (if it exists, migrate it)
    if (config.get('bulkEmail:provider')) {
        const provider = config.get('bulkEmail:provider');
        const providerConfig = config.get(`bulkEmail:${provider}`) || {};

        return {
            active: provider,
            [provider]: providerConfig
        };
    }

    // DEFAULT: mailgun
    return {
        active: 'mailgun',
        mailgun: config.get('bulkEmail:mailgun') || {}
    };
}
```

**Note:** Since nothing is shipped yet, we don't need to maintain backward compatibility. But this shows how we could if needed.

---

## 🧪 Testing Strategy

### Base Class Tests

```javascript
// test/unit/server/adapters/email/EmailProviderBase.test.js
describe('EmailProviderBase', function () {
    it('defines required send method', function () {
        const EmailProviderBase = require('../../../../../core/server/adapters/email/EmailProviderBase');
        const base = new EmailProviderBase({});

        base.requiredFns.should.include('send');
    });

    it('throws error when send() not implemented', async function () {
        const EmailProviderBase = require('../../../../../core/server/adapters/email/EmailProviderBase');
        const base = new EmailProviderBase({});

        await base.send({}).should.be.rejected();
    });
});
```

### Adapter Tests

```javascript
// test/unit/server/adapters/email/mailgun.test.js
describe('MailgunEmailProvider Adapter', function () {
    it('extends EmailProviderBase', function () {
        const EmailProviderBase = require('../../../../../core/server/adapters/email/EmailProviderBase');
        const MailgunEmailProvider = require('../../../../../core/server/adapters/email/mailgun');

        const adapter = new MailgunEmailProvider({});
        adapter.should.be.instanceOf(EmailProviderBase);
    });

    it('implements required send method', function () {
        const MailgunEmailProvider = require('../../../../../core/server/adapters/email/mailgun');
        const adapter = new MailgunEmailProvider({});

        adapter.send.should.be.a.Function();
    });

    it('sends email via MailgunClient', async function () {
        // ... comprehensive send test
    });
});
```

### Integration Tests

```javascript
// test/integration/server/services/adapter-manager/email.test.js
describe('AdapterManager - Email Adapters', function () {
    it('loads mailgun email adapter', function () {
        const adapterManager = require('../../../../../core/server/services/adapter-manager');
        const adapter = adapterManager.getAdapter('email');

        should.exist(adapter);
        adapter.send.should.be.a.Function();
    });
});
```

---

## 🚀 Branch Strategy (Avoid Contamination!)

### ⚠️ Critical: Work from `main` Every Time

**The Problem We Had Before:**
- PR2 was branched from PR1's branch
- PR3 was branched from PR2's branch
- Result: Each PR included all previous PR's changes

**The Solution:**
```bash
# ❌ WRONG - Creates dependencies
git checkout adapter/email-provider-base
git checkout -b adapter/email-provider-mailgun

# ✅ CORRECT - Independent branches
git checkout main
git pull origin main
git checkout -b adapter/email-provider-base

# When starting next PR
git checkout main
git pull origin main
git checkout -b adapter/email-provider-mailgun
```

### Branch Naming Convention

- `adapter/email-provider-base` - PR1
- `adapter/email-provider-mailgun` - PR2
- `adapter/email-analytics` - PR3
- `adapter/email-suppression` - PR4

### Verification Before Creating PR

```bash
# Check what files changed compared to main
git diff --name-status main...HEAD

# Should ONLY see files for current PR, not previous PRs!
```

---

## 📁 File Structure

### New Files to Create

```
ghost/core/core/server/
├── adapters/
│   ├── email/
│   │   ├── EmailProviderBase.js          # PR1
│   │   └── mailgun/
│   │       └── index.js                  # PR2 (refactored from MailgunEmailProvider.js)
│   ├── email-analytics/
│   │   ├── EmailAnalyticsBase.js         # PR3
│   │   └── mailgun/
│   │       └── index.js                  # PR3
│   └── email-suppression/
│       ├── EmailSuppressionBase.js       # PR4
│       ├── mailgun/
│       │   └── index.js                  # PR4
│       └── InMemoryEmailSuppressionList.js  # PR4 (moved from services)
│
├── services/
│   └── adapter-manager/
│       └── index.js                      # Updated in PR1, PR3, PR4 (register types)
│
└── test/unit/server/adapters/
    ├── email/
    │   ├── EmailProviderBase.test.js     # PR1
    │   └── mailgun.test.js               # PR2
    ├── email-analytics/
    │   ├── EmailAnalyticsBase.test.js    # PR3
    │   └── mailgun.test.js               # PR3
    └── email-suppression/
        ├── EmailSuppressionBase.test.js  # PR4
        ├── mailgun.test.js               # PR4
        └── in-memory.test.js             # PR4
```

### Files to Modify

**PR2:**
- `core/server/services/email-service/EmailServiceWrapper.js`
  - Change from direct instantiation to `adapterManager.getAdapter('email')`

**PR3:**
- `core/server/services/email-analytics/EmailAnalyticsServiceWrapper.js`
  - Change to use `adapterManager.getAdapter('email-analytics')`

**PR4:**
- `core/server/services/email-suppression-list/service.js`
  - Change to use `adapterManager.getAdapter('email-suppression')`

### Files to Remove/Move

**PR2:**
- ~~`core/server/services/email-service/MailgunEmailProvider.js`~~ → Move to `core/server/adapters/email/mailgun/index.js`

**PR4:**
- ~~`core/server/services/email-suppression-list/InMemoryEmailSuppressionList.js`~~ → Move to `core/server/adapters/email-suppression/in-memory/index.js`

---

## ♻️ What We Can Reuse from Factory Approach

### ✅ Can Reuse:

1. **Domain Understanding**
   - How email service works
   - What needs to be extracted
   - Integration points

2. **Test Fixtures**
   - Email data structures
   - Recipient data
   - Mock configurations
   - Expected responses

3. **Test Patterns**
   - Testing send functionality
   - Testing error handling
   - Testing event fetching
   - Testing suppression lists

4. **Documentation Insights**
   - Why we're doing this
   - What problems it solves
   - Architecture understanding

### ❌ Cannot Reuse:

1. **Implementation Code**
   - Factory functions → Adapter classes
   - Direct instantiation → AdapterManager
   - Custom config → Adapter config format

2. **Branch History**
   - Contaminated with cross-PR code
   - Start fresh from main

3. **Test Implementation**
   - Factory-style tests → Adapter validation tests
   - ProxyRequire mocking → AdapterManager mocking

---

## 🎯 Success Criteria

### Each PR Must:

- ✅ Build successfully
- ✅ All tests pass (no failures)
- ✅ ESLint passes (no errors)
- ✅ Only contains files for that specific PR (no contamination)
- ✅ Comprehensive test coverage
- ✅ Clear commit messages following Ghost conventions
- ✅ Self-contained and reviewable independently

### Overall Success:

- ✅ Email provider is adapter-based
- ✅ Analytics is adapter-based
- ✅ Suppression is adapter-based
- ✅ AdapterManager handles discovery
- ✅ Community can publish adapters to npm
- ✅ Configuration uses standard `adapters:` format
- ✅ All existing email functionality still works

---

## 📊 Progress Tracking

### PR1: Email Provider Base Class ✅ COMPLETE
- [x] Create EmailProviderBase.js
- [x] Register email adapter type
- [x] Write base class tests (8 passing)
- [x] Branch: adapter/email-provider-base (from main)
- [x] All tests passing
- [x] ESLint clean
- [x] Commit: d86a7d4b2a
- [ ] Push to GitHub (waiting for PR series completion)
- [ ] Create PR (waiting for PR series completion)

### PR2: Mailgun Email Provider Adapter ✅ COMPLETE
- [x] Move MailgunEmailProvider to adapters/email/mailgun/index.js
- [x] Extend EmailProviderBase
- [x] Add requiredFns validation
- [x] Update EmailServiceWrapper to use AdapterManager
- [x] Add runtime config injection to AdapterManager
- [x] Add resetCacheFor() to AdapterManager for encapsulation
- [x] Add safeguard to resetCacheFor() for unknown types
- [x] Fix caching for runtime dependencies
- [x] Remove legacy MailgunEmailProvider (single source of truth)
- [x] Write comprehensive tests (31 total: 23 adapter + 8 AdapterManager)
- [x] Add default email adapter config
- [x] Branch: adapter/email-provider-mailgun (from adapter/email-provider-base)
- [x] All tests passing
- [x] ESLint clean
- [x] Commit: a8492d8e63
- [ ] Push to GitHub (waiting for PR series completion)
- [ ] Create PR (waiting for PR series completion)

### PR3: Email Analytics Adapter ✅ COMPLETE
- [x] Create EmailAnalyticsBase.js
- [x] Register email-analytics adapter type
- [x] Implement mailgun analytics adapter
- [x] Remove legacy EmailAnalyticsProviderMailgun
- [x] Update EmailAnalyticsServiceWrapper to use AdapterManager
- [x] Add runtime config injection to AdapterManager
- [x] Add default email-analytics adapter config
- [x] Write comprehensive tests (24 total: 7 base + 17 Mailgun)
- [x] Branch: adapter/email-analytics (from main)
- [x] All tests passing
- [x] ESLint clean
- [x] Commit: 95edc1b817
- [ ] Push to GitHub (waiting for PR series completion)
- [ ] Create PR (waiting for PR series completion)

### PR4: Email Suppression Adapter ⬜️ Not Started
- [ ] Create EmailSuppressionBase.js
- [ ] Register email-suppression adapter type
- [ ] Implement mailgun suppression adapter
- [ ] Move InMemoryEmailSuppressionList to adapter
- [ ] Update suppression service
- [ ] Write comprehensive tests
- [ ] Branch: adapter/email-suppression (from main)
- [ ] All tests passing
- [ ] ESLint clean
- [ ] Push to GitHub
- [ ] Create PR

---

## 🐛 Known Pitfalls to Avoid

1. **Branch Contamination**
   - ❌ Don't branch from previous PR branches
   - ✅ Always branch from fresh `main`

2. **Missing Dependencies**
   - ❌ Don't use proxyquire without adding to package.json
   - ✅ Already in package.json from previous work

3. **ESLint Errors**
   - ❌ Quoted object keys when not needed
   - ❌ Arrow functions without parentheses with block bodies
   - ✅ Run `yarn lint` before committing

4. **Test Brittleness**
   - ❌ Testing implementation details
   - ✅ Test behavior and contracts

5. **Config Format**
   - ❌ Using `bulkEmail:provider`
   - ✅ Using `adapters:email`

---

## 📚 Reference Documentation

### Ghost Adapter System
- AdapterManager: `core/server/services/adapter-manager/AdapterManager.js`
- Docs: https://docs.ghost.org/config#adapters

### Existing Adapter Examples
- Storage: `core/server/adapters/storage/`
- Cache: `core/server/adapters/cache/`
- Scheduling: `core/server/adapters/scheduling/`
- SSO: `core/server/adapters/sso/`

### Base Classes
- `ghost-storage-base` (npm package)
- `@tryghost/adapter-base-cache` (npm package)
- `SchedulingBase` (core/server/adapters/scheduling/scheduling-base.js)
- `SSOBase` (core/server/adapters/sso/SSOBase.js)

---

## 🎬 Next Steps

**Current:** PR3 complete, moving to PR4 (final PR)

1. ✅ ~~Review this plan~~ - Approach confirmed
2. ✅ ~~Start PR1~~ - Email provider base class complete
3. ✅ ~~Test PR1~~ - 8 tests passing
4. ✅ ~~Start PR2~~ - Mailgun adapter complete
5. ✅ ~~Test PR2~~ - 31 tests passing, encapsulation + safeguards
6. ✅ ~~Start PR3~~ - Email analytics adapters complete
7. ✅ ~~Test PR3~~ - 24 tests passing, runtime config pattern established
8. **➡️ Start PR4** - Create email suppression adapters (FINAL PR)
9. **Submit series** - Push all 4 PRs to GitHub once complete

---

## 📝 Notes & Questions

### Open Questions:
- Should we support backward compatible config migration?
  - **Decision:** No, nothing is shipped yet
- Do we need all three adapter types in Ghost 6.x?
  - **Decision:** Yes, complete the foundation
- Should adapters go in npm packages or core first?
  - **Decision:** Core first (Mailgun), community can publish npm packages

### Decisions Made:
- ✅ Use adapter pattern (not factory)
- ✅ Start from scratch (fresh branches)
- ✅ Four PR series (base + mailgun + analytics + suppression)
- ✅ All branches from `main` (avoid contamination)
- ✅ Single master plan document (this file)

---

**End of Master Plan**
*Last Updated: 2025-10-25*
