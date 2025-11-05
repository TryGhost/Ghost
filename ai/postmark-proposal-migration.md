# Postmark Migration Analysis & Phase 2 Implementation Plan

**Purpose**: Audit existing Postmark PR (#22771), compare with our adapter approach (PRs #25250-25253), and create a defensive strategy for adding Postmark support that aligns with Ghost's existing patterns.

**Status**: Analysis complete, awaiting maintainer guidance on Admin UX approach

---

## 1. Current State Documentation

### 1.1 Current Mailgun Admin UX

**Pattern**: Hardcoded provider-specific settings panel

**View Mode**:
- Title: "Mailgun"
- Description: "The Mailgun API is used for bulk email newsletter delivery. Why is this required?"
- Status: "Mailgun is set up" ✓ (green checkmark icon)
- Edit button

**Edit Mode**:
- Mailgun region dropdown (🇺🇸 US / 🇪🇺 EU)
- Mailgun domain text field
- Mailgun private API key password field
- Help link: "Find your Mailgun API keys here"
- Cancel/Save buttons

**Component**: `apps/admin-x-settings/src/components/settings/email/Mailgun.tsx`
- Uses `TopLevelGroup` wrapper
- Uses `SettingGroupContent` for fields
- No provider selection dropdown
- Hardcoded to Mailgun

### 1.2 Ghost's Existing Adapter System

**Official Documentation**: https://docs.ghost.org/config#adapters

**Adapter Types**:
- `storage` - File storage (local, S3, etc.)
- `cache` - Caching (Redis, etc.)
- `sso` - Single sign-on
- `scheduling` - Post scheduling

**Selection Pattern**: Config-file based (NO UI)

```json
{
  "adapters": {
    "storage": {
      "active": "s3",
      "s3": {
        "accessKeyId": "...",
        "secretAccessKey": "...",
        "bucket": "...",
        "region": "..."
      }
    }
  }
}
```

**Key Characteristics**:
- Selection via `config.json`, not Admin UI
- Community adapters work via path resolution:
  - `ghost/content/adapters/{type}/{name}/index.js`
  - `node_modules/ghost-storage-{name}`
- AdapterManager handles registration and instantiation
- No UI for switching between adapter implementations

**Code Reference**: `ghost/core/core/server/services/adapter-manager/index.js`

---

## 2. Architecture Comparison

### 2.1 Postmark PR Approach (#22771)

**Files Changed**: 38 files

**Key Changes**:

1. **BulkEmailProvider.js** (renamed from MailgunEmailProvider.js)
   - Generic wrapper with `constructor.name` checks
   - Routes to MailgunClient or PostmarkClient based on class name
   - NOT using AdapterManager pattern
   - Error handling switches on provider type

```javascript
// Postmark PR Pattern
class BulkEmailProvider {
    #mailClient; // Generic mail client (Mailgun or Postmark)

    constructor({mailClient, errorHandler}) {
        this.#mailClient = mailClient;
    }

    async send(data, options) {
        // ... sending logic

        // ERROR HANDLING - switches on constructor.name
        if (this.#mailClient.constructor.name === 'MailgunClient') {
            // Mailgun-specific error handling
        } else if (this.#mailClient.constructor.name === 'PostmarkClient') {
            // Postmark-specific error handling (TODO)
        }
    }
}
```

2. **EmailServiceWrapper.js**
   - New `getMailClient()` method
   - Reads `bulk_email_provider` setting
   - Returns MailgunClient or PostmarkClient
   - Instantiates clients directly (not via AdapterManager)

```javascript
getMailClient(settingsCache, configService) {
    if (settingsCache.get('bulk_email_provider') === 'postmark') {
        return new PostmarkClient({config: configService, settings: settingsCache});
    }
    return new MailgunClient({config: configService, settings: settingsCache});
}
```

3. **Settings Changes** (`default-settings.json`)
   - New `bulk_email_provider` setting (default: "mailgun")
   - New `postmark_api_token` setting
   - Retains all Mailgun settings for backward compatibility

4. **Admin UI Changes** (NEW `BulkEmail.tsx`)
   - **Provider selection dropdown**: Postmark / Mailgun
   - Conditional field rendering based on selection
   - Replaces hardcoded `Mailgun.tsx` component
   - Self-contained provider switching in UI

```typescript
const BULK_EMAIL_OPTIONS = [
    {label: 'Postmark', value: 'postmark'},
    {label: 'Mailgun', value: 'mailgun'}
];

// Shows different fields based on emailProvider state
{emailProvider === 'mailgun' && MailgunSettings}
{emailProvider === 'postmark' && PostmarkSettings}
```

5. **New Packages**:
   - `ghost/postmark-client` - API client
   - `ghost/email-analytics-provider-postmark` - Analytics provider

**Assessment**:
- ✅ Works for Mailgun + Postmark
- ❌ Creates NEW pattern outside Ghost's adapter system
- ❌ Doesn't enable community adapters (hardcoded switch statements)
- ❌ Would need code changes for each new provider
- ❌ Doesn't align with storage/cache/SSO adapter patterns

### 2.2 Our Adapter Approach (PRs #25250-25253)

**Files Changed**:
- PR1: 3 files (EmailProviderBase + registration)
- PR2: 8 files (Mailgun adapter)
- PR3: 9 files (Analytics adapter + base)
- PR4: 10 files (Suppression adapter + base)

**Key Changes**:

1. **Uses Existing AdapterManager**
   - Registers adapters: `adapterManager.registerAdapter('email', EmailProviderBase)`
   - Same pattern as storage, cache, SSO, scheduling
   - Runtime config injection via second parameter
   - Cache management built-in

2. **Base Classes Define Contracts**
   - `EmailProviderBase.js` with `requiredFns = ['send']`
   - `EmailAnalyticsBase.js` for analytics
   - `EmailSuppressionBase.js` for suppression lists
   - Enforced via `Object.defineProperty()` immutability

3. **Mailgun as First Email Adapter**
   - `ghost/core/core/server/adapters/email/mailgun/index.js`
   - Extends EmailProviderBase
   - Clean separation: adapter logic vs client logic
   - Client injected via runtime config

4. **EmailServiceWrapper Integration**
   ```javascript
   // Our approach - uses AdapterManager
   const mailgunClient = new MailgunClient({config, settings});

   const mailgunEmailProvider = adapterManager.getAdapter('email', {
       mailgunClient,
       errorHandler
   });
   ```

5. **No UI Changes Yet**
   - Mailgun.tsx remains unchanged
   - Provider selection deferred to Phase 2
   - Focus on backend adapter infrastructure first

**Assessment**:
- ✅ Uses Ghost's established adapter pattern
- ✅ Enables community adapters automatically (via AdapterManager path resolution)
- ✅ Consistent with storage/cache/SSO adapters
- ✅ Extensible without code changes (new adapters just register)
- ✅ Clean separation of concerns (adapter vs client vs service)
- ⚠️ UI approach not yet defined (needs decision)

---

## 3. Admin UX Decision Matrix

**The Big Question**: How should users select between email providers?

### Option A: Config-Only Selection (Defensive, Matches Existing Pattern)

**Approach**: Follow storage/cache/SSO adapter pattern

**Config File** (`config.production.json`):
```json
{
  "adapters": {
    "email": {
      "active": "mailgun",
      "mailgun": {
        "domain": "mg.example.com",
        "apiKey": "key-xxx",
        "baseUrl": "https://api.mailgun.net/v3"
      }
    }
  }
}
```

Or with Postmark:
```json
{
  "adapters": {
    "email": {
      "active": "postmark",
      "postmark": {
        "apiToken": "xxx"
      }
    }
  }
}
```

**Admin UI Changes**: NONE
- Keep `Mailgun.tsx` as-is (shows Mailgun settings)
- Could add `Postmark.tsx` (shows Postmark settings)
- No dropdown to switch providers
- Settings panel reflects config.json selection

**Pros**:
- ✅ 100% consistent with existing adapter patterns
- ✅ No new UI patterns to get approved
- ✅ Config-based is familiar to self-hosted users
- ✅ Simpler implementation (no UI state management)
- ✅ Community adapters work same way as storage adapters

**Cons**:
- ❌ Less discoverable for non-technical users
- ❌ Can't switch providers from Admin UI
- ❌ Requires config file edit + restart

### Option B: UI Dropdown Selection (Postmark PR Pattern)

**Approach**: Add provider selection to Admin UI

**Settings Pattern** (stored in database):
```json
{
  "bulk_email_provider": "postmark",
  "postmark_api_token": "xxx",
  "mailgun_domain": "",
  "mailgun_api_key": ""
}
```

**Admin UI**: New `BulkEmail.tsx` component
```typescript
<Select
    options={[
        {label: 'Mailgun', value: 'mailgun'},
        {label: 'Postmark', value: 'postmark'}
    ]}
    title="Email provider"
    onSelect={(option) => updateSetting('bulk_email_provider', option?.value)}
/>

{emailProvider === 'mailgun' && <MailgunSettings />}
{emailProvider === 'postmark' && <PostmarkSettings />}
```

**Pros**:
- ✅ User-friendly (no config file editing)
- ✅ Can switch providers without restart
- ✅ Self-contained in Admin UI
- ✅ Similar to member access patterns (dropdown with options)

**Cons**:
- ❌ NEW pattern for adapters (no precedent in Ghost)
- ❌ Requires maintainer approval for pattern change
- ❌ Less clear how community adapters would appear in dropdown
- ❌ Settings stored in DB vs config (different from other adapters)
- ❌ Hardcoded provider list (doesn't discover adapters dynamically)

### Option C: Hybrid Approach

**Approach**: Config selects adapter, UI shows provider-specific settings

**How It Works**:
1. Config file sets active adapter: `"email": { "active": "postmark" }`
2. EmailServiceWrapper reads config, loads appropriate adapter
3. Admin UI detects active adapter, shows matching settings panel
4. No dropdown to switch (config-only), but UI adapts to config

**Pros**:
- ✅ Aligns with existing adapter pattern (config selection)
- ✅ Better UX than pure config (appropriate fields shown)
- ✅ Community adapters could have custom settings panels
- ✅ No hardcoded provider lists

**Cons**:
- ❌ More complex implementation
- ❌ Still requires config edit to switch providers
- ❌ Need to detect active adapter and map to UI component

### Recommended Approach

**For Phase 2 Initial Implementation**: Start with **Option A** (Config-Only)

**Rationale**:
1. Most defensive - 100% aligned with existing patterns
2. No new patterns requiring maintainer approval
3. Fastest path to adding Postmark support
4. Community adapters work automatically
5. Can always add UI selection later if maintainers approve

**Question for Maintainers** (ask in PR #25250 discussion):
> We're planning Phase 2 to add Postmark support using the adapter pattern established in this PR series.
>
> **Question**: Should email provider selection follow the existing config-file pattern (like storage adapters), or introduce UI-based selection (dropdown in Admin)?
>
> - **Option A**: Config-only (`"email": { "active": "postmark" }`) - matches storage/cache/SSO
> - **Option B**: UI dropdown + DB settings (`bulk_email_provider` setting) - more user-friendly
> - **Option C**: Hybrid (config selects, UI adapts)
>
> We're prepared to implement any approach, but want alignment before proceeding.

---

## 4. Code Reuse from Postmark PR (#22771)

### 4.1 What We Can Reuse (80% Compatible)

#### A. PostmarkClient (`ghost/postmark-client/lib/PostmarkClient.js`)

**Current Structure**:
```javascript
class PostmarkClient {
    constructor({config, settings}) {
        this.config = config;
        this.settings = settings;
        this.apiToken = settings.get('postmark_api_token');
    }

    async send(messageData, recipientData, replacements) {
        // Postmark API integration
        // Returns: {id: 'message-id'}
    }

    getBatchSize() {
        return 500; // Postmark batch limit
    }

    getTargetDeliveryWindow() {
        return 0; // No delay needed for Postmark
    }
}
```

**Adaptation Needed**: Minimal
- Already follows client pattern (separate from provider)
- Can inject into adapter via runtime config
- Interface compatible with MailgunClient

**Action**: Copy as-is to new package structure

#### B. EmailAnalyticsProviderPostmark

**Current Structure**:
```javascript
class EmailAnalyticsProviderPostmark {
    constructor({config, settings}) {
        this.config = config;
        this.settings = settings;
    }

    async fetchLatest(batchHandler, options) {
        // Fetch analytics from Postmark webhooks
        // Process events and call batchHandler
    }
}
```

**Adaptation Needed**: Convert to adapter pattern
- Extend `EmailAnalyticsBase` instead of standalone class
- Register with AdapterManager
- Otherwise very similar structure

**Action**: Extend base class, keep core logic

#### C. Test Patterns

**Reusable Elements**:
- Mock Postmark API responses
- Test fixtures for email data
- Error handling test cases
- Batch processing tests

**Action**: Adapt to adapter test structure (like our Mailgun adapter tests)

### 4.2 What Needs Complete Rework

#### A. BulkEmailProvider.js

**Problem**: Uses `constructor.name` checks instead of polymorphism

**Current**:
```javascript
if (this.#mailClient.constructor.name === 'MailgunClient') {
    // Mailgun error handling
} else if (this.#mailClient.constructor.name === 'PostmarkClient') {
    // Postmark error handling
}
```

**Our Approach**: Each adapter handles its own errors
```javascript
// ghost/core/core/server/adapters/email/postmark/index.js
class PostmarkEmailProvider extends EmailProviderBase {
    async send(data, options) {
        try {
            // Postmark sending logic
        } catch (e) {
            // Postmark-specific error handling
            throw new errors.EmailError({...});
        }
    }
}
```

**Action**: Create PostmarkEmailProvider extending EmailProviderBase

#### B. EmailServiceWrapper Provider Selection

**Current**: Direct instantiation with getMailClient()
```javascript
getMailClient(settingsCache, configService) {
    if (settingsCache.get('bulk_email_provider') === 'postmark') {
        return new PostmarkClient({...});
    }
    return new MailgunClient({...});
}
```

**Our Approach**: AdapterManager selection
```javascript
// Determine active provider from config
const activeProvider = configService.get('email:active') || 'mailgun';
const providerConfig = configService.get(`email:${activeProvider}`);

// Instantiate provider-specific client
const emailClient = activeProvider === 'postmark'
    ? new PostmarkClient({...})
    : new MailgunClient({...});

// Get adapter from AdapterManager with runtime config
const emailProvider = adapterManager.getAdapter('email', {
    emailClient,
    errorHandler
});
```

**Action**: Modify EmailServiceWrapper to read config, select client, use AdapterManager

#### C. Settings Schema

**Current**: Flat settings in DB
- `bulk_email_provider`: "postmark" | "mailgun"
- `postmark_api_token`: string
- `mailgun_domain`, `mailgun_api_key`, etc.

**Our Approach** (if using config):
- Config file: `adapters.email.active` = "postmark"
- Config file: `adapters.email.postmark.apiToken` = "xxx"

**OR** (if using UI approach):
- Keep DB settings similar to Postmark PR
- Add validation and serialization

**Action**: Decide based on UX approach (Option A vs B)

---

## 5. Phase 2 Implementation Plan

### 5.1 Overview

**Goal**: Add Postmark support using our adapter pattern, test locally before submitting

**Approach**: 4-PR series mirroring Phase 1 structure

**Base Branch**: `adapter/email-suppression` (after PRs 1-4 merge)

**Testing Strategy**:
1. Implement all 4 PRs locally
2. Test with real Postmark account
3. Verify against Postmark PR functionality
4. Get maintainer feedback on UX approach
5. Submit PRs only after validation

### 5.2 Local Branch Structure

```
adapter/email-provider-base (PR1 - MERGED)
  └── adapter/email-provider-mailgun (PR2 - MERGED)
       └── adapter/email-analytics (PR3 - MERGED)
            └── adapter/email-suppression (PR4 - MERGED)
                 └── adapter/email-provider-postmark (PR5 - LOCAL FIRST)
                      └── adapter/email-analytics-postmark (PR6 - LOCAL FIRST)
                           └── adapter/email-suppression-postmark (PR7 - LOCAL FIRST)
                                └── adapter/email-ui-provider-selection (PR8 - LOCAL FIRST)
```

### 5.3 PR5: Postmark Email Provider Adapter

**Branch**: `adapter/email-provider-postmark`

**Files to Create** (~8 files):

1. **Core Adapter**:
   - `ghost/core/core/server/adapters/email/postmark/index.js`

   ```javascript
   const EmailProviderBase = require('../EmailProviderBase');
   const errors = require('@tryghost/errors');
   const logging = require('@tryghost/logging');
   const debug = require('@tryghost/debug')('email-service:postmark-adapter');

   class PostmarkEmailProvider extends EmailProviderBase {
       #postmarkClient;
       #errorHandler;

       constructor(config) {
           super(config);

           if (!config.postmarkClient) {
               throw new errors.IncorrectUsageError({
                   message: 'Postmark adapter requires postmarkClient in config'
               });
           }

           if (typeof config.postmarkClient.send !== 'function') {
               throw new errors.IncorrectUsageError({
                   message: 'postmarkClient must have a send() method'
               });
           }

           this.#postmarkClient = config.postmarkClient;
           this.#errorHandler = config.errorHandler;
       }

       async send(data, options) {
           const {subject, html, plaintext, from, replyTo, emailId, recipients, replacementDefinitions} = data;

           logging.info(`Sending email via Postmark to ${recipients.length} recipients`);
           const startTime = Date.now();

           try {
               // Transform data for Postmark format
               const messageData = {
                   subject,
                   html,
                   plaintext,
                   from,
                   replyTo,
                   id: emailId,
                   track_opens: !!options.openTrackingEnabled,
                   track_clicks: !!options.clickTrackingEnabled
               };

               // Postmark-specific recipient data transformation
               const recipientData = this.#createRecipientData(recipients, replacementDefinitions);

               // Send via Postmark
               const response = await this.#postmarkClient.send(messageData, recipientData, []);

               debug(`sent message (${Date.now() - startTime}ms)`);

               return {
                   id: response.id || 'unknown'
               };
           } catch (e) {
               // Postmark-specific error handling
               const ghostError = new errors.EmailError({
                   statusCode: e.statusCode,
                   message: this.#createPostmarkErrorMessage(e),
                   errorDetails: JSON.stringify({
                       error: {status: e.statusCode, message: e.message},
                       recipientCount: recipients.length
                   }).slice(0, 2000),
                   context: `Postmark Error ${e.statusCode || ''}: ${e.message}`,
                   help: 'https://ghost.org/docs/newsletters/#bulk-email-configuration',
                   code: 'BULK_EMAIL_SEND_FAILED'
               });

               debug(`failed to send message (${Date.now() - startTime}ms)`);

               if (this.#errorHandler) {
                   try {
                       Promise.resolve(this.#errorHandler(ghostError)).catch(() => {});
                   } catch (handlerError) {
                       // Ignore handler errors
                   }
               }

               throw ghostError;
           }
       }

       #createRecipientData(recipients, replacementDefinitions) {
           // Postmark recipient data transformation
           return recipients.reduce((acc, recipient) => {
               acc[recipient.email] = (recipient.replacements || []).reduce((vars, replacement) => {
                   vars[replacement.id] = replacement.value;
                   return vars;
               }, {});
               return acc;
           }, {});
       }

       #createPostmarkErrorMessage(error) {
           const message = (error?.message || 'Postmark Error') + (error?.details ? (': ' + error.details) : '');
           return message.slice(0, 2000);
       }

       getMaximumRecipients() {
           return this.#postmarkClient.getBatchSize();
       }

       getTargetDeliveryWindow() {
           return this.#postmarkClient.getTargetDeliveryWindow();
       }
   }

   module.exports = PostmarkEmailProvider;
   ```

2. **Postmark Client Package**:
   - `ghost/postmark-client/lib/PostmarkClient.js` (copy from PR #22771)
   - `ghost/postmark-client/index.js`
   - `ghost/postmark-client/package.json`

3. **Tests**:
   - `ghost/core/test/unit/server/adapters/email/postmark/index.test.js`
   - Follow pattern from Mailgun adapter tests
   - Mock PostmarkClient
   - Test error handling, recipient data transformation, batch limits

4. **Registration** (ONLY if config-based):
   - Update `EmailServiceWrapper.js` to detect Postmark config
   - Instantiate PostmarkClient when active
   - Pass to AdapterManager

**Testing**:
```bash
yarn test:single test/unit/server/adapters/email/postmark/index.test.js
```

**Expected File Count**: 8 files

### 5.4 PR6: Postmark Email Analytics Adapter

**Branch**: `adapter/email-analytics-postmark`

**Files to Create** (~8 files):

1. **Analytics Adapter**:
   - `ghost/core/core/server/adapters/email-analytics/postmark/index.js`

   ```javascript
   const EmailAnalyticsBase = require('../EmailAnalyticsBase');
   const errors = require('@tryghost/errors');

   class PostmarkEmailAnalytics extends EmailAnalyticsBase {
       #apiClient;
       #config;

       constructor(config) {
           super(config);

           if (!config.apiClient) {
               throw new errors.IncorrectUsageError({
                   message: 'Postmark analytics adapter requires apiClient'
               });
           }

           this.#apiClient = config.apiClient;
           this.#config = config;
       }

       async fetchLatest(batchHandler, options) {
           // Fetch events from Postmark
           const events = await this.#apiClient.fetchEvents(options);

           // Normalize to Ghost format
           const normalizedEvents = events.map(this.#normalizeEvent.bind(this));

           // Process in batches
           await batchHandler(normalizedEvents);
       }

       #normalizeEvent(postmarkEvent) {
           // Convert Postmark event format to Ghost format
           return {
               type: this.#mapEventType(postmarkEvent.type),
               emailId: postmarkEvent.emailId,
               memberId: postmarkEvent.memberId,
               timestamp: new Date(postmarkEvent.timestamp)
           };
       }

       #mapEventType(postmarkType) {
           const mapping = {
               'Delivery': 'delivered',
               'Open': 'opened',
               'Click': 'clicked',
               'Bounce': 'failed',
               'SpamComplaint': 'complained',
               'Unsubscribe': 'unsubscribed'
           };
           return mapping[postmarkType] || 'unknown';
       }
   }

   module.exports = PostmarkEmailAnalytics;
   ```

2. **Analytics Package**:
   - Copy from PR #22771: `ghost/email-analytics-provider-postmark/`
   - Adapt to match our adapter structure

3. **Registration**:
   - Update `EmailAnalyticsServiceWrapper.js`
   - Register Postmark analytics adapter
   - Runtime config injection

4. **Tests**:
   - `ghost/core/test/unit/server/adapters/email-analytics/postmark/index.test.js`

**Expected File Count**: 8 files

### 5.5 PR7: Postmark Email Suppression Adapter

**Branch**: `adapter/email-suppression-postmark`

**Files to Create** (~8 files):

1. **Suppression Adapter**:
   - `ghost/core/core/server/adapters/email-suppression/postmark/index.js`

   ```javascript
   const EmailSuppressionBase = require('../EmailSuppressionBase');
   const errors = require('@tryghost/errors');

   class PostmarkEmailSuppression extends EmailSuppressionBase {
       #apiClient;

       constructor(config) {
           super(config);

           if (!config.apiClient) {
               throw new errors.IncorrectUsageError({
                   message: 'Postmark suppression adapter requires apiClient'
               });
           }

           this.#apiClient = config.apiClient;
       }

       async getSuppressionList(type) {
           // Fetch suppression list from Postmark
           const list = await this.#apiClient.getSuppressions(type);
           return list.map(item => ({
               email: item.email,
               reason: item.reason,
               createdAt: new Date(item.createdAt)
           }));
       }

       async removeFromSuppressionList(email) {
           await this.#apiClient.removeEmail(email);
       }

       async isSuppressed(email) {
           const result = await this.#apiClient.checkSuppression(email);
           return result.suppressed;
       }

       async bulkCheck(emails) {
           const results = await this.#apiClient.bulkCheckSuppression(emails);
           return results.map(r => ({
               email: r.email,
               suppressed: r.suppressed,
               reason: r.reason
           }));
       }
   }

   module.exports = PostmarkEmailSuppression;
   ```

2. **Tests**:
   - Follow EmailSuppressionBase test pattern
   - Mock Postmark API client

3. **Registration**:
   - Update suppression list service wrapper
   - Inject Postmark API client when active

**Expected File Count**: 8 files

### 5.6 PR8: Admin UI for Provider Selection

**Branch**: `adapter/email-ui-provider-selection`

**Two Variants to Implement and Test**:

#### Variant A: Config-Only (No UI Changes)

**Files**: 0 files changed (documentation only)

**Documentation**:
```markdown
# Configuring Postmark for Bulk Email

## 1. Create Postmark Account
Sign up at https://postmarkapp.com

## 2. Get API Token
Navigate to Servers → API Tokens

## 3. Update Ghost Config

Edit `config.production.json`:

```json
{
  "adapters": {
    "email": {
      "active": "postmark",
      "postmark": {
        "apiToken": "your-postmark-api-token"
      }
    },
    "email-analytics": {
      "active": "postmark",
      "postmark": {
        "apiToken": "your-postmark-api-token"
      }
    },
    "email-suppression": {
      "active": "postmark",
      "postmark": {
        "apiToken": "your-postmark-api-token"
      }
    }
  }
}
```

## 4. Restart Ghost
```

**Pros**: Zero UI changes, 100% defensive

#### Variant B: UI Dropdown (Test Postmark PR Pattern)

**Files** (~5 files):

1. **New BulkEmail Component**:
   - `apps/admin-x-settings/src/components/settings/email/BulkEmail.tsx`

   ```typescript
   import React from 'react';
   import TopLevelGroup from '../../TopLevelGroup';
   import useSettingGroup from '../../../hooks/useSettingGroup';
   import {IconLabel, Link, Select, SettingGroupContent, TextField, withErrorBoundary} from '@tryghost/admin-x-design-system';
   import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';

   const EMAIL_PROVIDER_OPTIONS = [
       {label: 'Mailgun', value: 'mailgun'},
       {label: 'Postmark', value: 'postmark'}
   ];

   const MAILGUN_REGIONS = [
       {label: '🇺🇸 US', value: 'https://api.mailgun.net/v3'},
       {label: '🇪🇺 EU', value: 'https://api.eu.mailgun.net/v3'}
   ];

   const BulkEmail: React.FC<{ keywords: string[] }> = ({keywords}) => {
       const {
           localSettings,
           isEditing,
           saveState,
           handleSave,
           handleCancel,
           updateSetting,
           handleEditingChange
       } = useSettingGroup();

       const [emailProvider, mailgunRegion, mailgunDomain, mailgunApiKey, postmarkApiToken] = getSettingValues(localSettings, [
           'bulk_email_provider', 'mailgun_base_url', 'mailgun_domain', 'mailgun_api_key', 'postmark_api_token'
       ]) as string[];

       const isMailgunSetup = emailProvider === 'mailgun' && mailgunDomain && mailgunApiKey;
       const isPostmarkSetup = emailProvider === 'postmark' && postmarkApiToken;
       const isProviderSetup = isMailgunSetup || isPostmarkSetup;

       const selectedProviderLabel = EMAIL_PROVIDER_OPTIONS.find(option => option.value === emailProvider)?.label || '';

       const data = isProviderSetup ? [
           {
               key: 'status',
               value: (
                   <div className="grid w-full grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
                       <div className="flex flex-col">
                           <h6 className="block text-xs font-semibold tracking-normal dark:text-white">Status</h6>
                           <div className="mt-1 flex items-center">
                               <IconLabel icon='check-circle' iconColorClass='text-green'>
                                   Email provider is set up
                               </IconLabel>
                           </div>
                       </div>
                       <div className="flex flex-col">
                           <h6 className="block text-xs font-semibold tracking-normal dark:text-white">Provider</h6>
                           <div className="mt-1 flex items-center">
                               {selectedProviderLabel}
                           </div>
                       </div>
                   </div>
               )
           }
       ] : [
           {
               heading: 'Status',
               key: 'status',
               value: 'Email provider is not set up'
           }
       ];

       const values = (
           <SettingGroupContent
               columns={1}
               values={data}
           />
       );

       const MailgunSettings = (
           <SettingGroupContent>
               <div className='mt-6 grid grid-cols-[120px_auto] gap-x-3 gap-y-6'>
                   <Select
                       options={MAILGUN_REGIONS}
                       selectedOption={MAILGUN_REGIONS.find(option => option.value === mailgunRegion)}
                       title="Mailgun region"
                       onSelect={(option) => updateSetting('mailgun_base_url', option?.value || null)}
                   />
                   <TextField
                       title='Mailgun domain'
                       value={mailgunDomain}
                       onChange={(e) => updateSetting('mailgun_domain', e.target.value)}
                   />
                   <div className='col-span-2'>
                       <TextField
                           hint={<>Find your Mailgun API keys <Link href="https://app.mailgun.com/settings/api_security" rel="noopener noreferrer" target="_blank">here</Link></>}
                           title='Mailgun private API key'
                           type='password'
                           value={mailgunApiKey}
                           onChange={(e) => updateSetting('mailgun_api_key', e.target.value)}
                       />
                   </div>
               </div>
           </SettingGroupContent>
       );

       const PostmarkSettings = (
           <SettingGroupContent>
               <div className='mt-6 grid grid-cols-[120px_auto] gap-x-3 gap-y-6'>
                   <div className='col-span-2'>
                       <TextField
                           hint={<>Find your Postmark API token <Link href="https://postmarkapp.com/developer/api/overview#authentication" rel="noopener noreferrer" target="_blank">here</Link></>}
                           title='Postmark API token'
                           type='password'
                           value={postmarkApiToken}
                           onChange={(e) => updateSetting('postmark_api_token', e.target.value)}
                       />
                   </div>
               </div>
           </SettingGroupContent>
       );

       const inputs = (
           <SettingGroupContent>
               <div className='grid grid-cols-[120px_auto] gap-x-3 gap-y-6'>
                   <div className='col-span-2'>
                       <Select
                           options={EMAIL_PROVIDER_OPTIONS}
                           selectedOption={EMAIL_PROVIDER_OPTIONS.find(option => option.value === emailProvider)}
                           title="Email provider"
                           onSelect={(option) => updateSetting('bulk_email_provider', option?.value || null)}
                       />
                       {emailProvider === 'mailgun' && MailgunSettings}
                       {emailProvider === 'postmark' && PostmarkSettings}
                   </div>
               </div>
           </SettingGroupContent>
       );

       const groupDescription = (
           <>Configure a provider for bulk email newsletter delivery. <Link href='https://ghost.org/docs/faq/mailgun-newsletters/' target='_blank'>Why is this required?</Link></>
       );

       return (
           <TopLevelGroup
               description={groupDescription}
               isEditing={isEditing}
               keywords={keywords}
               navid='bulk-email'
               saveState={saveState}
               testId='bulk-email'
               title='Email provider'
               onCancel={handleCancel}
               onEditingChange={handleEditingChange}
               onSave={handleSave}
           >
               {isEditing ? inputs : values}
           </TopLevelGroup>
       );
   };

   export default withErrorBoundary(BulkEmail, 'Email provider');
   ```

2. **Update EmailSettings.tsx**:
   - Replace `<Mailgun />` import with `<BulkEmail />`
   - Update keywords for search

3. **Settings Schema**:
   - Add `bulk_email_provider` to `default-settings.json`
   - Add `postmark_api_token` to `default-settings.json`
   - Update settings serializer

4. **EmailServiceWrapper Integration**:
   - Read `bulk_email_provider` setting
   - Instantiate appropriate client
   - Pass to AdapterManager

**Expected File Count**: 5 files

**Test Both Variants**:
1. Test config-only locally with Postmark account
2. Test UI dropdown locally with Postmark account
3. Compare UX, gather feedback
4. Document findings for maintainers

### 5.7 Testing Strategy

**Setup**:
1. Create Postmark test account
2. Get API token
3. Configure Ghost locally

**Test Cases**:
- [ ] Send bulk email via Postmark adapter
- [ ] Verify recipient data transformation
- [ ] Test batch limits (500 for Postmark)
- [ ] Verify open/click tracking
- [ ] Test error handling
- [ ] Verify analytics event fetching
- [ ] Test suppression list management
- [ ] Switch between Mailgun and Postmark (if UI variant)
- [ ] Verify settings persistence
- [ ] Test with real newsletter send

**Validation**:
- All adapter tests pass
- Integration with SendingService works
- EmailServiceWrapper correctly instantiates adapters
- No regressions to Mailgun functionality

---

## 6. Community Adapter Enablement

### 6.1 How Community Adapters Work

With our adapter pattern, community developers can create email adapters without modifying Ghost core.

**Directory Structure**:
```
ghost/
└── content/
    └── adapters/
        └── email/
            ├── sendgrid/
            │   ├── index.js
            │   └── package.json
            ├── aws-ses/
            │   ├── index.js
            │   └── package.json
            └── custom-smtp/
                ├── index.js
                └── package.json
```

**Example: SendGrid Community Adapter**

`ghost/content/adapters/email/sendgrid/index.js`:
```javascript
const EmailProviderBase = require('../../../core/core/server/adapters/email/EmailProviderBase');
const sendgrid = require('@sendgrid/mail');

class SendGridEmailProvider extends EmailProviderBase {
    constructor(config) {
        super(config);
        sendgrid.setApiKey(config.apiKey);
    }

    async send(data, options) {
        // SendGrid implementation
    }

    getMaximumRecipients() {
        return 1000; // SendGrid limit
    }

    getTargetDeliveryWindow() {
        return 0;
    }
}

module.exports = SendGridEmailProvider;
```

**Configuration**:
```json
{
  "adapters": {
    "email": {
      "active": "sendgrid",
      "sendgrid": {
        "apiKey": "SG.xxx"
      }
    }
  }
}
```

**AdapterManager automatically**:
1. Searches `ghost/content/adapters/email/sendgrid/`
2. Requires `index.js`
3. Validates it extends EmailProviderBase
4. Instantiates with config
5. Returns to EmailServiceWrapper

**No code changes needed in Ghost core!**

### 6.2 Documentation for Community Developers

Create `docs/adapters/email-provider.md`:

```markdown
# Creating Email Provider Adapters

Email provider adapters allow Ghost to send bulk email through different services.

## Requirements

1. Extend `EmailProviderBase`
2. Implement `send()` method
3. Implement `getMaximumRecipients()` method
4. Implement `getTargetDeliveryWindow()` method

## Example

See `ghost/core/core/server/adapters/email/mailgun/` for reference implementation.

## Installation

1. Create directory: `ghost/content/adapters/email/{your-provider}/`
2. Add `index.js` with your adapter class
3. Configure in `config.json`:
   ```json
   {
     "adapters": {
       "email": {
         "active": "your-provider",
         "your-provider": {
           "apiKey": "...",
           // ... provider-specific config
         }
       }
     }
   }
   ```
4. Restart Ghost

## Methods to Implement

### send(data, options)

Send an email.

**Parameters**:
- `data.subject` - Email subject
- `data.html` - HTML content
- `data.plaintext` - Plain text content
- `data.from` - Sender address
- `data.replyTo` - Reply-to address
- `data.emailId` - Unique email ID
- `data.recipients` - Array of recipient objects
- `data.replacementDefinitions` - Variable definitions
- `options.openTrackingEnabled` - Enable open tracking
- `options.clickTrackingEnabled` - Enable click tracking

**Returns**: `Promise<{id: string}>` - Provider message ID

### getMaximumRecipients()

Return maximum recipients per batch.

**Returns**: `number`

### getTargetDeliveryWindow()

Return delay between batches in milliseconds.

**Returns**: `number`

## Error Handling

Throw `errors.EmailError` with:
- `statusCode` - HTTP status code
- `message` - Error message (max 2000 chars)
- `errorDetails` - JSON error details (redact PII!)
- `context` - Error context
- `code` - 'BULK_EMAIL_SEND_FAILED'

## Testing

Create tests in `test/unit/server/adapters/email/{your-provider}/`.

See Mailgun adapter tests for examples.
```

---

## 7. Questions for Ghost Maintainers

Before proceeding with Phase 2, we need guidance on:

### Question 1: Admin UX Pattern

**Context**: Email adapters can follow config-only pattern (like storage) or introduce UI selection (new pattern).

**Options**:
- **A**: Config-file only - matches existing adapter pattern, no UI changes
- **B**: UI dropdown in Admin - user-friendly, new pattern for adapters
- **C**: Hybrid - config selects, UI adapts

**Question**: Which approach do you prefer for email provider selection?

**Our recommendation**: Start with Option A (config-only) for maximum alignment with existing patterns, can add UI later if approved.

### Question 2: Settings Storage

**Context**: Postmark PR uses DB settings (`bulk_email_provider`). Other adapters use config files.

**Question**: Should email provider settings:
- Use config.json (like storage/cache/SSO)?
- Use database settings (like Postmark PR)?
- Support both?

### Question 3: Migration Strategy

**Context**: Existing Ghost instances have Mailgun configured.

**Question**: How should we handle migration?
- Default to Mailgun if no `email.active` specified?
- Migrate existing `mailgun_*` settings to adapter config?
- Provide migration script?

### Question 4: Community Adapter Documentation

**Question**: Where should community adapter documentation live?
- Ghost docs site?
- README in repo?
- Separate guide?

### Question 5: Postmark PR Status

**Question**: What's the status of PR #22771? Should we:
- Wait for decision on that PR?
- Proceed with our adapter approach independently?
- Coordinate with original author?

---

## 8. Success Criteria

Phase 2 implementation is successful when:

### Functional Requirements
- [ ] Postmark sends bulk email successfully
- [ ] All tracking (open/click) works correctly
- [ ] Batch limits respected (500 for Postmark)
- [ ] Error handling captures Postmark-specific errors
- [ ] Analytics events fetched and processed
- [ ] Suppression list management works
- [ ] No regressions to existing Mailgun functionality

### Architectural Requirements
- [ ] Uses AdapterManager pattern (not custom BulkEmailProvider)
- [ ] Extends EmailProviderBase/EmailAnalyticsBase/EmailSuppressionBase
- [ ] Runtime config injection via AdapterManager
- [ ] Adapters registered properly
- [ ] Cache management works correctly

### Testing Requirements
- [ ] All unit tests pass
- [ ] Integration tests with real Postmark account
- [ ] Error scenarios covered
- [ ] Batch processing validated
- [ ] Newsletter send end-to-end test

### Documentation Requirements
- [ ] Community adapter guide created
- [ ] Configuration examples provided
- [ ] Migration guide (if needed)
- [ ] Admin UX documented (config or UI)

### Community Enablement
- [ ] Pattern established for other providers (SendGrid, SES, etc.)
- [ ] No core code changes needed for new adapters
- [ ] Clear path for community contributions

---

## 9. Timeline & Next Steps

### Immediate (Week 1)
1. ✅ Create this analysis document
2. ⏸️ Get user review and feedback
3. ⏸️ Post questions to maintainers in PR #25250
4. ⏸️ Wait for UX approach decision

### Short-term (Week 2-3)
1. Create local branches for PR5-8
2. Implement Postmark email provider adapter
3. Implement Postmark analytics adapter
4. Implement Postmark suppression adapter
5. Implement both UI variants (config vs dropdown)

### Medium-term (Week 4)
1. Test locally with real Postmark account
2. Validate against Postmark PR functionality
3. Document findings and UX comparison
4. Get feedback from maintainers

### Long-term (Week 5+)
1. Submit PR5-8 based on approved approach
2. Respond to code review feedback
3. Merge Phase 2 PRs
4. Document community adapter pattern
5. Share knowledge for SendGrid/SES implementations

---

## 10. Summary & Recommendations

### What We Learned from Postmark PR

**Strengths**:
- ✅ Working Postmark integration (proven to send email)
- ✅ Complete UI for provider selection
- ✅ Comprehensive test coverage
- ✅ User-friendly configuration

**Architectural Concerns**:
- ❌ Doesn't use Ghost's AdapterManager system
- ❌ Creates new `BulkEmailProvider` pattern outside established conventions
- ❌ Hardcoded provider switching (constructor.name checks)
- ❌ Doesn't enable community adapters
- ❌ Would require code changes for each new provider

### Why Our Adapter Approach is Better

**Alignment**:
- ✅ Uses existing AdapterManager (same as storage/cache/SSO/scheduling)
- ✅ Follows established Ghost patterns
- ✅ No new architectural patterns to approve
- ✅ Consistent with documentation: https://docs.ghost.org/config#adapters

**Extensibility**:
- ✅ Community adapters work automatically (via path resolution)
- ✅ No core code changes needed for new providers
- ✅ Clean separation: adapter vs client vs service
- ✅ Base classes enforce contracts

**Maintainability**:
- ✅ Polymorphism instead of type checks
- ✅ Each adapter handles its own errors
- ✅ Cache management built-in
- ✅ Runtime config injection

### Phase 2 Recommendation

**Approach**: Start with config-only (Option A) for provider selection

**Rationale**:
1. 100% defensive - matches existing patterns
2. No new UI patterns requiring approval
3. Community adapters work same as storage adapters
4. Can add UI selection later if maintainers approve
5. Fastest path to Postmark support

**Strategy**:
1. Build all 4 PRs locally first
2. Test thoroughly with real Postmark account
3. Document both UX approaches
4. Get maintainer feedback before submitting
5. Submit PRs only after validation

**Code Reuse**:
- PostmarkClient: 80% reusable
- Analytics provider: 70% reusable (needs base class)
- Suppression provider: 70% reusable (needs base class)
- UI components: Conditionally reusable (if Option B approved)

### Final Thoughts

The Postmark PR (#22771) represents significant effort and a working solution. However, it introduces a new architectural pattern that doesn't align with Ghost's existing adapter system.

Our approach leverages Ghost's established AdapterManager pattern, enabling:
- Consistency with storage/cache/SSO adapters
- Automatic community adapter support
- Clean, maintainable code architecture
- Extensibility without core changes

By reusing the Postmark PR's client code but adapting it to our pattern, we get the best of both worlds: proven Postmark integration + Ghost's established adapter architecture.

**The path forward**: Get maintainer guidance on UX approach, then implement Phase 2 using our adapter pattern.

---

## Appendices

### Appendix A: File Count Comparison

**Postmark PR (#22771)**: 38 files
- Core changes: 15 files
- Admin UI: 8 files
- New packages: 10 files
- Tests: 5 files

**Our Phase 1 (PRs 1-4)**: 30 files
- PR1 (base): 3 files
- PR2 (Mailgun): 8 files
- PR3 (Analytics): 9 files
- PR4 (Suppression): 10 files

**Projected Phase 2 (PRs 5-8)**: ~29 files
- PR5 (Postmark provider): 8 files
- PR6 (Postmark analytics): 8 files
- PR7 (Postmark suppression): 8 files
- PR8 (UI - if Option B): 5 files

**Total (Phase 1 + 2)**: ~59 files for complete email adapter system with two providers

### Appendix B: References

**Ghost Documentation**:
- Adapters: https://docs.ghost.org/config#adapters
- Configuration: https://ghost.org/docs/config/

**Related PRs**:
- Postmark PR: https://github.com/TryGhost/Ghost/pull/22771
- Our PR1: https://github.com/TryGhost/Ghost/pull/25250
- Our PR2: https://github.com/TryGhost/Ghost/pull/25251
- Our PR3: https://github.com/TryGhost/Ghost/pull/25252
- Our PR4: https://github.com/TryGhost/Ghost/pull/25253

**Code References**:
- AdapterManager: `ghost/core/core/server/services/adapter-manager/`
- EmailServiceWrapper: `ghost/core/core/server/services/email-service/EmailServiceWrapper.js`
- Current Mailgun UI: `apps/admin-x-settings/src/components/settings/email/Mailgun.tsx`

### Appendix C: Community Adapter Examples

Potential community adapters enabled by our pattern:

1. **SendGrid** (`ghost/content/adapters/email/sendgrid/`)
2. **Amazon SES** (`ghost/content/adapters/email/aws-ses/`)
3. **Mailjet** (`ghost/content/adapters/email/mailjet/`)
4. **SparkPost** (`ghost/content/adapters/email/sparkpost/`)
5. **Custom SMTP** (`ghost/content/adapters/email/smtp/`)

All would work without any Ghost core changes, just like storage adapters.

---

**Document Version**: 1.0
**Last Updated**: 2025-10-25
**Status**: Ready for review
**Next Action**: Get user feedback, then ask maintainers for UX guidance
