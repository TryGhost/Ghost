# Centralized Verified Emails Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Ghost's duplicated email verification logic with a centralized `verified_emails` table and `EmailVerificationService`, so addresses verified once are usable site-wide.

**Architecture:** New `verified_emails` table + `EmailVerificationService` that owns all verification state and token flows. Existing consumers (newsletters, settings) delegate to this service instead of managing their own verification. Nullable FK columns on `newsletters` and `automated_emails` track usage for safe deletion.

**Tech Stack:** Node.js/Express backend, Bookshelf ORM, Knex migrations, MagicLink + SingleUseTokenProvider for tokens, React + TanStack Query frontend.

---

### Task 1: Add `verified_emails` table to schema and create migration

**Files:**
- Modify: `ghost/core/core/server/data/schema/schema.js`
- Create: `ghost/core/core/server/data/migrations/versions/6.20/2026-03-02-12-00-00-add-verified-emails-table.js`

**Step 1: Add table definition to schema**

In `ghost/core/core/server/data/schema/schema.js`, add the `verified_emails` table definition. Place it near the `tokens` table (around line 926). Follow the existing pattern:

```js
verified_emails: {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    email: {type: 'string', maxlength: 191, nullable: false, unique: true},
    status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'pending'},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true}
},
```

**Step 2: Create the migration file**

Create directory `ghost/core/core/server/data/migrations/versions/6.20/` and add the migration file:

```js
const {addTable} = require('../../utils');

module.exports = addTable('verified_emails', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    email: {type: 'string', maxlength: 191, nullable: false, unique: true},
    status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'pending'},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true}
});
```

**Step 3: Run migration to verify**

```bash
cd ghost/core && yarn knex-migrator migrate
```

Expected: Migration runs successfully, `verified_emails` table created.

**Step 4: Commit**

```bash
git add ghost/core/core/server/data/schema/schema.js ghost/core/core/server/data/migrations/versions/6.20/
git commit -m "Added verified_emails table schema and migration"
```

---

### Task 2: Add FK columns to `newsletters` table

**Files:**
- Modify: `ghost/core/core/server/data/schema/schema.js`
- Create: `ghost/core/core/server/data/migrations/versions/6.20/2026-03-02-12-00-01-add-verified-email-fks-to-newsletters.js`

**Step 1: Add FK columns to newsletters schema**

In `ghost/core/core/server/data/schema/schema.js`, add two nullable FK columns to the `newsletters` table definition (after `sender_reply_to` at line 21):

```js
sender_email_verified_email_id: {type: 'string', maxlength: 24, nullable: true, references: 'verified_emails.id', setNullDelete: true},
sender_reply_to_verified_email_id: {type: 'string', maxlength: 24, nullable: true, references: 'verified_emails.id', setNullDelete: true},
```

Note: Use `setNullDelete` (not `cascadeDelete`) so that deleting a verified email nulls out the FK rather than deleting the newsletter.

**Step 2: Create migration**

Use the `createAddColumnMigration` utility from `ghost/core/core/server/data/migrations/utils/schema.js`. Create two migration files (one per column), or a single custom migration that adds both. The simplest approach is two files:

File: `2026-03-02-12-00-01-add-sender-email-verified-email-id-to-newsletters.js`
```js
const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('newsletters', 'sender_email_verified_email_id', {
    type: 'string', maxlength: 24, nullable: true, references: 'verified_emails.id', setNullDelete: true
});
```

File: `2026-03-02-12-00-02-add-sender-reply-to-verified-email-id-to-newsletters.js`
```js
const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('newsletters', 'sender_reply_to_verified_email_id', {
    type: 'string', maxlength: 24, nullable: true, references: 'verified_emails.id', setNullDelete: true
});
```

**Step 3: Run migration**

```bash
cd ghost/core && yarn knex-migrator migrate
```

**Step 4: Commit**

```bash
git add ghost/core/core/server/data/schema/schema.js ghost/core/core/server/data/migrations/versions/6.20/
git commit -m "Added verified email FK columns to newsletters table"
```

---

### Task 3: Add FK columns to `automated_emails` table

**Files:**
- Modify: `ghost/core/core/server/data/schema/schema.js`
- Create: `ghost/core/core/server/data/migrations/versions/6.20/2026-03-02-12-00-03-add-sender-email-verified-email-id-to-automated-emails.js`
- Create: `ghost/core/core/server/data/migrations/versions/6.20/2026-03-02-12-00-04-add-sender-reply-to-verified-email-id-to-automated-emails.js`

**Step 1: Add FK columns to automated_emails schema**

Same pattern as Task 2, but for the `automated_emails` table in schema.js:

```js
sender_email_verified_email_id: {type: 'string', maxlength: 24, nullable: true, references: 'verified_emails.id', setNullDelete: true},
sender_reply_to_verified_email_id: {type: 'string', maxlength: 24, nullable: true, references: 'verified_emails.id', setNullDelete: true},
```

**Step 2: Create migrations**

Same pattern as Task 2, targeting `automated_emails`.

**Step 3: Run migration and commit**

```bash
cd ghost/core && yarn knex-migrator migrate
git add ghost/core/core/server/data/schema/schema.js ghost/core/core/server/data/migrations/versions/6.20/
git commit -m "Added verified email FK columns to automated_emails table"
```

---

### Task 4: Create data migration to seed `verified_emails` from existing addresses

**Files:**
- Create: `ghost/core/core/server/data/migrations/versions/6.20/2026-03-02-12-00-05-seed-verified-emails-from-existing.js`

**Step 1: Write the data migration**

This migration scans existing custom email addresses and inserts them as verified. It also backfills the FK columns on newsletters.

```js
const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');
const ObjectId = require('bson-objectid');

module.exports = createTransactionalMigration(
    async function up(knex) {
        // Collect unique custom emails from newsletters
        const newsletterEmails = await knex('newsletters')
            .select('id', 'sender_email', 'sender_reply_to')
            .whereNotNull('sender_email')
            .orWhereNotIn('sender_reply_to', ['newsletter', 'support']);

        // Collect custom support address from settings
        const supportSetting = await knex('settings')
            .select('value')
            .where('key', 'members_support_address')
            .first();

        const emailsToInsert = new Map(); // email -> generated id
        const now = knex.fn.now();

        // Collect unique emails
        for (const row of newsletterEmails) {
            if (row.sender_email && !emailsToInsert.has(row.sender_email)) {
                emailsToInsert.set(row.sender_email, ObjectId().toHexString());
            }
            if (row.sender_reply_to && !['newsletter', 'support'].includes(row.sender_reply_to) && !emailsToInsert.has(row.sender_reply_to)) {
                emailsToInsert.set(row.sender_reply_to, ObjectId().toHexString());
            }
        }

        if (supportSetting && supportSetting.value && supportSetting.value !== 'noreply' && supportSetting.value.includes('@')) {
            if (!emailsToInsert.has(supportSetting.value)) {
                emailsToInsert.set(supportSetting.value, ObjectId().toHexString());
            }
        }

        if (emailsToInsert.size === 0) {
            logging.info('No custom email addresses to migrate to verified_emails');
            return;
        }

        // Insert verified emails
        const rows = Array.from(emailsToInsert.entries()).map(([email, id]) => ({
            id,
            email,
            status: 'verified',
            created_at: now,
            updated_at: now
        }));

        await knex.batchInsert('verified_emails', rows);
        logging.info(`Migrated ${rows.length} email addresses to verified_emails`);

        // Backfill FK columns on newsletters
        for (const row of newsletterEmails) {
            const updates = {};
            if (row.sender_email && emailsToInsert.has(row.sender_email)) {
                updates.sender_email_verified_email_id = emailsToInsert.get(row.sender_email);
            }
            if (row.sender_reply_to && !['newsletter', 'support'].includes(row.sender_reply_to) && emailsToInsert.has(row.sender_reply_to)) {
                updates.sender_reply_to_verified_email_id = emailsToInsert.get(row.sender_reply_to);
            }
            if (Object.keys(updates).length > 0) {
                await knex('newsletters').where('id', row.id).update(updates);
            }
        }
    },
    async function down(knex) {
        await knex('verified_emails').del();
        await knex('newsletters').update({
            sender_email_verified_email_id: null,
            sender_reply_to_verified_email_id: null
        });
    }
);
```

**Step 2: Run migration**

```bash
cd ghost/core && yarn knex-migrator migrate
```

**Step 3: Commit**

```bash
git add ghost/core/core/server/data/migrations/versions/6.20/
git commit -m "Added data migration to seed verified_emails from existing addresses"
```

---

### Task 5: Create `VerifiedEmail` model

**Files:**
- Create: `ghost/core/core/server/models/verified-email.js`

**Step 1: Create the model**

Models in `ghost/core/core/server/models/` are auto-discovered (see `models/index.js` line 22-28 — any `.js` file in the directory is auto-required). No manual registration needed.

```js
const ghostBookshelf = require('./base');

const VerifiedEmail = ghostBookshelf.Model.extend({
    tableName: 'verified_emails'
}, {
    orderDefaultRaw: function orderDefaultRaw() {
        return 'created_at DESC';
    }
});

module.exports = {
    VerifiedEmail: ghostBookshelf.model('VerifiedEmail', VerifiedEmail)
};
```

**Step 2: Verify model loads**

```bash
cd ghost/core && node -e "require('./core/server/models'); console.log('Models loaded OK')"
```

**Step 3: Commit**

```bash
git add ghost/core/core/server/models/verified-email.js
git commit -m "Added VerifiedEmail model"
```

---

### Task 6: Create `EmailVerificationService`

**Files:**
- Create: `ghost/core/core/server/services/email-verification/email-verification-service.js`
- Create: `ghost/core/core/server/services/email-verification/index.js`
- Create: `ghost/core/core/server/services/email-verification/emails/verify-email.js`

**Step 1: Create the email template**

Base on the existing templates at `ghost/core/core/server/services/newsletters/emails/verify-email.js` and `ghost/core/core/server/services/settings/emails/verify-email.js`. These are nearly identical — consolidate into one at `ghost/core/core/server/services/email-verification/emails/verify-email.js`.

Copy the newsletter version and use it as-is (it accepts `{email, url}` and returns HTML).

**Step 2: Create the service class**

`ghost/core/core/server/services/email-verification/email-verification-service.js`:

```js
const MagicLink = require('../lib/magic-link/magic-link');
const verifyEmailTemplate = require('./emails/verify-email');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

class EmailVerificationService {
    /** @type {object} */ #VerifiedEmailModel;
    /** @type {object} */ #NewsletterModel;
    /** @type {object} */ #SettingsModel;
    /** @type {object} */ #AutomatedEmailModel;
    /** @type {MagicLink} */ #magicLinkService;
    /** @type {object} */ #mail;
    /** @type {object} */ #emailAddressService;

    constructor({
        VerifiedEmailModel,
        NewsletterModel,
        SettingsModel,
        AutomatedEmailModel,
        singleUseTokenProvider,
        mail,
        urlUtils,
        emailAddressService
    }) {
        this.#VerifiedEmailModel = VerifiedEmailModel;
        this.#NewsletterModel = NewsletterModel;
        this.#SettingsModel = SettingsModel;
        this.#AutomatedEmailModel = AutomatedEmailModel;
        this.#mail = mail;
        this.#emailAddressService = emailAddressService;

        this.#magicLinkService = new MagicLink({
            tokenProvider: singleUseTokenProvider,
            getSigninURL(token) {
                const adminUrl = urlUtils.urlFor('admin', true);
                const signinURL = new URL(adminUrl);
                signinURL.hash = `/settings/verified-emails/?verifyEmail=${token}`;
                return signinURL.href;
            }
        });
    }

    /**
     * List all verified emails
     */
    async list() {
        return this.#VerifiedEmailModel.findAll();
    }

    /**
     * Check if an email is already verified
     */
    async check(email) {
        const existing = await this.#VerifiedEmailModel.findOne({email, status: 'verified'});
        return !!existing;
    }

    /**
     * Add an email for verification (or return immediately if already verified)
     * @param {string} email
     * @param {object} [context] - {type: 'newsletter'|'setting'|'automated_email', id?, property?, key?}
     */
    async add(email, context) {
        const existing = await this.#VerifiedEmailModel.findOne({email});

        if (existing && existing.get('status') === 'verified') {
            return {verified: true, email};
        }

        if (!existing) {
            await this.#VerifiedEmailModel.add({email, status: 'pending'});
        }

        // Send (or resend) verification email
        await this.#sendVerificationEmail(email, context);

        return {pending: true, email};
    }

    /**
     * Verify a token and apply context if provided
     */
    async verify(token) {
        const data = await this.#magicLinkService.getDataFromToken(token);
        const {email, context} = data;

        // Mark as verified
        const existing = await this.#VerifiedEmailModel.findOne({email});
        if (!existing) {
            throw new errors.NotFoundError({message: 'Email address not found'});
        }
        await this.#VerifiedEmailModel.edit({status: 'verified'}, {id: existing.get('id')});

        // Apply to context if provided
        let result = {email};
        if (context) {
            result = await this.#applyToContext(email, existing.get('id'), context);
        }

        return result;
    }

    /**
     * Delete a verified email (only if not in use)
     */
    async destroy(id) {
        const usages = await this.#findUsages(id);
        if (usages.length > 0) {
            throw new errors.ValidationError({
                message: 'This email address is in use and cannot be deleted',
                context: usages
            });
        }
        await this.#VerifiedEmailModel.destroy({id});
    }

    /**
     * Find all places a verified email is referenced
     */
    async #findUsages(id) {
        const usages = [];

        const newsletters = await this.#NewsletterModel.findAll({
            filter: `sender_email_verified_email_id:${id}+sender_reply_to_verified_email_id:${id}`,
            mongoTransformer: function (query) {
                // Use OR logic
                query.where(function () {
                    this.where('sender_email_verified_email_id', id)
                        .orWhere('sender_reply_to_verified_email_id', id);
                });
            }
        });
        // Simpler approach: query directly
        // This may need adjustment based on how Ghost's filter system works.
        // Alternative: use two separate queries.

        // TODO: Refine the query approach during implementation. The key
        // logic is to check both FK columns on newsletters, both FK columns
        // on automated_emails, and text match on settings.

        return usages;
    }

    async #applyToContext(email, verifiedEmailId, context) {
        switch (context.type) {
        case 'newsletter': {
            const attrs = {[context.property]: email};
            const fkColumn = context.property === 'sender_email'
                ? 'sender_email_verified_email_id'
                : 'sender_reply_to_verified_email_id';
            attrs[fkColumn] = verifiedEmailId;
            const newsletter = await this.#NewsletterModel.edit(attrs, {id: context.id});
            return {email, context, newsletter};
        }
        case 'setting': {
            await this.#SettingsModel.edit({key: context.key, value: email});
            return {email, context};
        }
        case 'automated_email': {
            const attrs = {[context.property]: email};
            const fkColumn = context.property === 'sender_email'
                ? 'sender_email_verified_email_id'
                : 'sender_reply_to_verified_email_id';
            attrs[fkColumn] = verifiedEmailId;
            await this.#AutomatedEmailModel.edit(attrs, {id: context.id});
            return {email, context};
        }
        default:
            return {email, context};
        }
    }

    async #sendVerificationEmail(email, context) {
        const defaultAddress = this.#emailAddressService.service.defaultFromAddress;

        await this.#magicLinkService.sendMagicLink({
            email,
            tokenData: {email, context},
            subject: 'Verify email address',
            customMessage: verifyEmailTemplate({email}),
            from: defaultAddress
        });
    }
}

module.exports = EmailVerificationService;
```

Note: The `#findUsages` method needs refinement during implementation. The exact query approach will depend on how Ghost's Bookshelf filter system supports OR queries across FK columns. A simpler fallback is two separate queries per table.

**Step 3: Create the service singleton**

`ghost/core/core/server/services/email-verification/index.js`:

```js
const EmailVerificationService = require('./email-verification-service');
const SingleUseTokenProvider = require('../members/single-use-token-provider');
const mail = require('../mail');
const models = require('../../models');
const urlUtils = require('../../../shared/url-utils');
const emailAddressService = require('../email-address');

const MAGIC_LINK_TOKEN_VALIDITY = 24 * 60 * 60 * 1000;
const MAGIC_LINK_TOKEN_VALIDITY_AFTER_USAGE = 10 * 60 * 1000;
const MAGIC_LINK_TOKEN_MAX_USAGE_COUNT = 7;

module.exports = new EmailVerificationService({
    VerifiedEmailModel: models.VerifiedEmail,
    NewsletterModel: models.Newsletter,
    SettingsModel: models.Settings,
    AutomatedEmailModel: models.AutomatedEmail,
    mail,
    singleUseTokenProvider: new SingleUseTokenProvider({
        SingleUseTokenModel: models.SingleUseToken,
        validityPeriod: MAGIC_LINK_TOKEN_VALIDITY,
        validityPeriodAfterUsage: MAGIC_LINK_TOKEN_VALIDITY_AFTER_USAGE,
        maxUsageCount: MAGIC_LINK_TOKEN_MAX_USAGE_COUNT
    }),
    urlUtils,
    emailAddressService
});
```

**Step 4: Commit**

```bash
git add ghost/core/core/server/services/email-verification/
git commit -m "Added EmailVerificationService with centralized verification logic"
```

---

### Task 7: Create API endpoints for verified emails

**Files:**
- Create: `ghost/core/core/server/api/endpoints/verified-emails.js`
- Modify: `ghost/core/core/server/web/api/endpoints/admin/routes.js`

**Step 1: Create the API endpoint file**

`ghost/core/core/server/api/endpoints/verified-emails.js`:

```js
const emailVerificationService = require('../../services/email-verification');

/** @type {import('@docready/api-framework').Controller} */
const controller = {
    docName: 'verified_emails',

    browse: {
        headers: {cacheInvalidate: false},
        permissions: true,
        async query() {
            return emailVerificationService.list();
        }
    },

    add: {
        statusCode: 201,
        headers: {cacheInvalidate: false},
        permissions: true,
        data: ['email', 'context'],
        async query(frame) {
            return emailVerificationService.add(frame.data.email, frame.data.context);
        }
    },

    verify: {
        headers: {cacheInvalidate: true},
        permissions: {method: 'edit'},
        data: ['token'],
        async query(frame) {
            return emailVerificationService.verify(frame.data.token);
        }
    },

    destroy: {
        statusCode: 204,
        headers: {cacheInvalidate: true},
        permissions: true,
        async query(frame) {
            return emailVerificationService.destroy(frame.options.id);
        }
    }
};

module.exports = controller;
```

**Step 2: Add routes**

In `ghost/core/core/server/web/api/endpoints/admin/routes.js`, add the verified-emails routes near the existing settings/newsletter verification routes:

```js
// Verified emails
router.get('/verified-emails', mw.authAdminApi, http(api.verifiedEmails.browse));
router.post('/verified-emails', mw.authAdminApi, http(api.verifiedEmails.add));
router.put('/verified-emails/verify', mw.authAdminApi, http(api.verifiedEmails.verify));
router.del('/verified-emails/:id', mw.authAdminApi, http(api.verifiedEmails.destroy));
```

Note: Check how the `api` object loads endpoints — it likely auto-discovers from the `endpoints/` directory similar to models. If the file is named `verified-emails.js`, the key may be `verifiedEmails` or `verified_emails`. Verify during implementation by checking how `api` is assembled in the routes file imports.

**Step 3: Commit**

```bash
git add ghost/core/core/server/api/endpoints/verified-emails.js ghost/core/core/server/web/api/endpoints/admin/routes.js
git commit -m "Added API endpoints and routes for verified emails"
```

---

### Task 8: Write unit tests for `EmailVerificationService`

**Files:**
- Create: `ghost/core/test/unit/server/services/email-verification/email-verification-service.test.js`

**Step 1: Write tests**

Follow the pattern from `ghost/core/test/unit/server/services/newsletters/service.test.js` and `ghost/core/test/unit/server/services/settings/settings-bread-service.test.js`. Use Mocha + Sinon + assert.

Test cases to cover:
- `add()` with a new email → creates pending row + sends verification email
- `add()` with an already-verified email → returns `{verified: true}` without sending email
- `add()` with a pending email → resends verification email
- `verify()` with valid token → marks email as verified
- `verify()` with valid token + context → marks verified AND applies to context
- `verify()` with unknown email → throws NotFoundError
- `check()` returns true for verified email, false for pending/missing
- `destroy()` when not in use → deletes
- `destroy()` when in use → throws ValidationError
- `list()` returns all verified emails

Use a `TestTokenProvider` (same pattern as existing tests at `ghost/core/test/unit/server/services/newsletters/service.test.js` lines 14-22) that serializes token data as JSON and returns it on validate.

**Step 2: Run tests**

```bash
cd ghost/core && yarn test:single test/unit/server/services/email-verification/email-verification-service.test.js
```

**Step 3: Commit**

```bash
git add ghost/core/test/unit/server/services/email-verification/
git commit -m "Added unit tests for EmailVerificationService"
```

---

### Task 9: Refactor `NewslettersService` to use `EmailVerificationService`

**Files:**
- Modify: `ghost/core/core/server/services/newsletters/newsletters-service.js`
- Modify: `ghost/core/core/server/services/newsletters/index.js`

**Step 1: Inject `EmailVerificationService` dependency**

In `newsletters-service.js` constructor, accept `emailVerificationService` as a new dependency. In `index.js`, pass the singleton:

```js
const emailVerificationService = require('../email-verification');
// ... in constructor call:
emailVerificationService
```

**Step 2: Replace verification methods**

In `newsletters-service.js`:

- **Replace `prepAttrsForEmailVerification`** (lines 265-319): Instead of managing its own verification flow, call `emailVerificationService.check(email)`. If verified, allow the save and set the FK column. If not verified, strip the property from attrs and add to `emailsToVerify` (same response pattern, but the frontend will use the new add endpoint).

- **Remove `sendEmailVerificationMagicLink`** (lines 340-360): No longer needed — the new service handles this.

- **Simplify `respondWithEmailVerification`** (lines 324-335): This can be simplified to just set the meta flags. The actual email sending is now handled by the `EmailVerificationService.add()` call from the frontend.

- **Update `verifyPropertyUpdate`** (lines 245-258): Delegate to `emailVerificationService.verify(token)` or keep the existing route for backwards compatibility with already-sent verification emails (tokens created before migration). Decision: keep the old endpoint working for a transition period, but new tokens use the new endpoint.

**Step 3: Update existing tests**

Modify `ghost/core/test/unit/server/services/newsletters/service.test.js` to account for the refactored verification logic. The verification-specific tests (lines 260-279) should test the new delegation pattern.

**Step 4: Run tests**

```bash
cd ghost/core && yarn test:single test/unit/server/services/newsletters/service.test.js
```

**Step 5: Commit**

```bash
git add ghost/core/core/server/services/newsletters/
git commit -m "Refactored NewslettersService to use centralized EmailVerificationService"
```

---

### Task 10: Refactor `SettingsBREADService` to use `EmailVerificationService`

**Files:**
- Modify: `ghost/core/core/server/services/settings/settings-bread-service.js`
- Modify: `ghost/core/core/server/services/settings/settings-service.js`

**Step 1: Inject dependency and refactor**

Same pattern as Task 9. In `settings-service.js` (`getSettingsBREADServiceInstance` at lines 29-45), add `emailVerificationService` to the constructor.

In `settings-bread-service.js`:

- **Replace `prepSettingsForEmailVerification`** (lines 309-341): Use `emailVerificationService.check(email)`.
- **Remove `requiresEmailVerification`** (lines 346-354): The TODO at line 352 (`// TODO: check for known/verified email`) is now implemented by the new service.
- **Remove `sendEmailVerificationMagicLink`** (lines 375-395).
- **Simplify `respondWithEmailVerification`** (lines 359-370).
- **Keep `verifyKeyUpdate`** (lines 240-255) working for backwards compatibility with existing tokens.
- Remove the `MagicLink` and `SingleUseTokenProvider` setup from the constructor (lines 50-89) since verification is no longer handled here.

**Step 2: Update tests and run**

```bash
cd ghost/core && yarn test:single test/unit/server/services/settings/settings-bread-service.test.js
```

**Step 3: Commit**

```bash
git add ghost/core/core/server/services/settings/
git commit -m "Refactored SettingsBREADService to use centralized EmailVerificationService"
```

---

### Task 11: Write E2E API tests for verified emails endpoints

**Files:**
- Create: `ghost/core/test/e2e-api/admin/verified-emails.test.js`

**Step 1: Write E2E tests**

Follow the pattern from `ghost/core/test/e2e-api/admin/newsletters.test.js` and `ghost/core/test/e2e-api/admin/settings.test.js`.

Test cases:
- `GET /verified-emails/` returns empty list initially
- `POST /verified-emails/` with new email → returns pending, sends verification email
- `POST /verified-emails/` with already-verified email → returns verified
- `PUT /verified-emails/verify/` with valid token → marks as verified
- `PUT /verified-emails/verify/` with token + newsletter context → verifies and updates newsletter
- `PUT /verified-emails/verify/` with token + setting context → verifies and updates setting
- `DELETE /verified-emails/:id/` when not in use → deletes
- `DELETE /verified-emails/:id/` when in use → returns error
- Integration: newsletter edit with verified email → saves directly without verification
- Integration: newsletter edit with unverified email → does not save

**Step 2: Run tests**

```bash
cd ghost/core && yarn test:e2e test/e2e-api/admin/verified-emails.test.js
```

**Step 3: Commit**

```bash
git add ghost/core/test/e2e-api/admin/verified-emails.test.js
git commit -m "Added E2E API tests for verified emails"
```

---

### Task 12: Update existing E2E tests for newsletters and settings

**Files:**
- Modify: `ghost/core/test/e2e-api/admin/newsletters.test.js`
- Modify: `ghost/core/test/e2e-api/admin/settings.test.js`

**Step 1: Update newsletter E2E tests**

The tests at lines 900-936 and 1280-1318 of `newsletters.test.js` test the old verification flow. Update them to reflect the new behavior where the frontend calls the verified-emails endpoint for verification, not the newsletter endpoint.

Keep the existing `PUT /newsletters/verifications/` tests working for backwards compatibility.

**Step 2: Update settings E2E tests**

The tests at lines 556, 617, and 651 of `settings.test.js` test the old verification flow. Update similarly.

**Step 3: Run all E2E tests**

```bash
cd ghost/core && yarn test:e2e
```

**Step 4: Commit**

```bash
git add ghost/core/test/e2e-api/admin/newsletters.test.js ghost/core/test/e2e-api/admin/settings.test.js
git commit -m "Updated newsletter and settings E2E tests for centralized email verification"
```

---

### Task 13: Add frontend API hooks for verified emails

**Files:**
- Create: `apps/admin-x-framework/src/api/verified-emails.ts`

**Step 1: Create the API hooks**

Follow the pattern from `apps/admin-x-framework/src/api/newsletters.ts` and `apps/admin-x-framework/src/api/email-verification.ts`.

```ts
import {createQuery, createMutation} from '../utils/api/hooks';

export type VerifiedEmail = {
    id: string;
    email: string;
    status: 'pending' | 'verified';
    created_at: string;
    updated_at: string | null;
};

export type VerifiedEmailsResponseType = {
    verified_emails: VerifiedEmail[];
};

const dataType = 'VerifiedEmailsResponseType';

export const useBrowseVerifiedEmails = createQuery<VerifiedEmailsResponseType>({
    dataType,
    path: '/verified-emails/'
});

export const useAddVerifiedEmail = createMutation<VerifiedEmailsResponseType, {email: string; context?: object}>({
    method: 'POST',
    path: () => '/verified-emails/',
    body: ({email, context}) => ({email, context}),
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: (newData) => newData
    }
});

export const useVerifyEmail = createMutation<VerifiedEmailsResponseType, {token: string}>({
    method: 'PUT',
    path: () => '/verified-emails/verify/',
    body: ({token}) => ({token}),
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: (newData) => newData
    }
});

export const useDeleteVerifiedEmail = createMutation<unknown, {id: string}>({
    method: 'DELETE',
    path: ({id}) => `/verified-emails/${id}/`,
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: (newData) => newData
    }
});
```

Note: The exact hook utility signatures (`createQuery`, `createMutation`) need to be verified against the actual implementations in `admin-x-framework`. The patterns above are based on the existing hooks but may need adjustment.

**Step 2: Commit**

```bash
git add apps/admin-x-framework/src/api/verified-emails.ts
git commit -m "Added frontend API hooks for verified emails"
```

---

### Task 14: Build `VerifiedEmailSelect` combobox component

**Files:**
- Create: `apps/admin-x-settings/src/components/settings/email/VerifiedEmailSelect.tsx`

**Step 1: Build the component**

Use the `shade` design system (shadcn/ui + Radix). The component should:

- Accept props: `value`, `onChange`, `specialOptions` (e.g., `[{value: 'newsletter', label: 'Newsletter address'}]`), `context` (for the add flow)
- Fetch verified emails via `useBrowseVerifiedEmails()`
- Render a combobox/select with:
  - Special options at top (if provided)
  - Verified emails
  - Pending emails (disabled, with "Pending verification" badge)
  - "Add new email..." action
  - "Manage verified emails..." action
- "Add new..." opens an inline text input. On submit, calls `useAddVerifiedEmail` with email + context.
- "Manage verified emails..." opens the management modal (Task 15).

This component is only rendered on managed email hosts. The parent component should check `emailAddressService.managedEmailEnabled` (or equivalent frontend config) and fall back to a plain text input for self-hosted.

**Step 2: Commit**

```bash
git add apps/admin-x-settings/src/components/settings/email/VerifiedEmailSelect.tsx
git commit -m "Added VerifiedEmailSelect combobox component"
```

---

### Task 15: Build "Manage Verified Emails" modal

**Files:**
- Create: `apps/admin-x-settings/src/components/settings/email/VerifiedEmailsModal.tsx`

**Step 1: Build the modal**

Use `shade` design system + NiceModal. The modal should:

- List all verified + pending emails from `useBrowseVerifiedEmails()`
- Each row shows: email, status badge, and actions
- Verified + not in use → delete button (calls `useDeleteVerifiedEmail`)
- Verified + in use → shows usage context, delete disabled
- Pending → "Resend verification" button (calls `useAddVerifiedEmail` to resend)

Determining "in use" on the frontend: the API could include a `usages` field on each verified email in the browse response, or the frontend could cross-reference with newsletter data it already has. The simpler approach is to include usage info in the API response (add to Task 7's browse endpoint).

**Step 2: Commit**

```bash
git add apps/admin-x-settings/src/components/settings/email/VerifiedEmailsModal.tsx
git commit -m "Added Manage Verified Emails modal"
```

---

### Task 16: Integrate `VerifiedEmailSelect` into newsletter detail modal

**Files:**
- Modify: `apps/admin-x-settings/src/components/settings/email/newsletters/newsletter-detail-modal.tsx`

**Step 1: Replace existing sender/reply-to inputs**

In the newsletter detail modal, replace the free-text inputs for `sender_email` and `sender_reply_to` with the `VerifiedEmailSelect` component (on managed email hosts).

For `sender_reply_to`, pass special options: `[{value: 'newsletter', label: 'Newsletter address'}, {value: 'support', label: 'Support address'}]`.

For `sender_email`, pass no special options (or a "Use default" option).

Pass the appropriate context: `{type: 'newsletter', id: newsletter.id, property: 'sender_email'}` or `{type: 'newsletter', id: newsletter.id, property: 'sender_reply_to'}`.

**Step 2: Remove old verification toast logic**

Remove the `meta.sent_email_verification` handling (lines 778-798) since the combobox handles this via the add flow.

**Step 3: Commit**

```bash
git add apps/admin-x-settings/src/components/settings/email/newsletters/newsletter-detail-modal.tsx
git commit -m "Integrated VerifiedEmailSelect into newsletter detail modal"
```

---

### Task 17: Integrate `VerifiedEmailSelect` into portal settings

**Files:**
- Modify: `apps/admin-x-settings/src/components/settings/membership/portal/portal-modal.tsx`

**Step 1: Replace support address input**

Replace the free-text input for `members_support_address` with `VerifiedEmailSelect`. Pass special option: `[{value: 'noreply', label: 'No reply'}]`. Pass context: `{type: 'setting', key: 'members_support_address'}`.

**Step 2: Remove old verification handling**

Remove the `verifyEmail` query param handling (lines 72-110) and the `meta.sent_email_verification` handling.

**Step 3: Commit**

```bash
git add apps/admin-x-settings/src/components/settings/membership/portal/portal-modal.tsx
git commit -m "Integrated VerifiedEmailSelect into portal settings"
```

---

### Task 18: Add unified verification link handler

**Files:**
- Modify: `apps/admin-x-settings/src/components/settings/email/newsletters.tsx`
- Create or modify: A route-level component that handles `#/settings/verified-emails/?verifyEmail={token}`

**Step 1: Add the verification handler**

Create a handler (or add to an existing settings route component) that:
1. Reads `verifyEmail` from the URL params at `#/settings/verified-emails/`
2. Calls `useVerifyEmail({token})`
3. Shows a confirmation modal based on the returned context

**Step 2: Remove old verification handlers**

Remove the `verifyEmail` handling from:
- `newsletters.tsx` (lines 34-90)
- `portal-modal.tsx` (lines 72-110)

Keep them working for a transition period if there may be pending tokens from the old system (tokens are valid for 24 hours, so after 24 hours post-deploy, old tokens expire).

**Step 3: Commit**

```bash
git add apps/admin-x-settings/src/components/settings/
git commit -m "Added unified verification link handler, removed old handlers"
```

---

### Task 19: Clean up old verification code

**Files:**
- Modify: `ghost/core/core/server/services/newsletters/newsletters-service.js` — remove MagicLink setup from constructor
- Delete: `ghost/core/core/server/services/newsletters/emails/verify-email.js`
- Modify: `ghost/core/core/server/services/settings/settings-bread-service.js` — remove MagicLink setup from constructor
- Delete: `ghost/core/core/server/services/settings/emails/verify-email.js`
- Modify: `ghost/core/core/server/services/newsletters/index.js` — remove SingleUseTokenProvider instantiation
- Modify: `ghost/core/core/server/services/settings/settings-service.js` — remove SingleUseTokenProvider instantiation
- Modify: `apps/admin-x-framework/src/api/email-verification.ts` — deprecate or remove old hook

**Step 1: Remove dead code**

Remove all the verification-related code that has been replaced by the centralized service. Keep the old API routes (`PUT /newsletters/verifications/` and `PUT /settings/verifications/`) as deprecated endpoints that delegate to the new service, to handle any in-flight tokens.

**Step 2: Run full test suite**

```bash
cd ghost/core && yarn test:unit && yarn test:e2e
```

**Step 3: Commit**

```bash
git add -A
git commit -m "Cleaned up old email verification code replaced by centralized service"
```

---

### Task 20: Final integration testing

**Step 1: Run full lint**

```bash
yarn lint
```

**Step 2: Run full unit tests**

```bash
cd ghost/core && yarn test:unit
```

**Step 3: Run full E2E tests**

```bash
cd ghost/core && yarn test:e2e
```

**Step 4: Manual smoke test**

Start dev environment and verify:
1. Newsletter detail modal shows combobox with verified emails
2. Adding a new email sends verification
3. Clicking verification link verifies and applies the address
4. Portal settings support address uses combobox
5. "Manage verified emails" modal works (list, delete unused, can't delete in-use)
6. Self-hosted sites still show free-text inputs

**Step 5: Final commit if any fixes needed**
