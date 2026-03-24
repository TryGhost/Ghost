# Email Templates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a reusable `email_templates` table with design/general columns, link it to `automated_emails` via FK, expose browse/read/edit API, and wire up the frontend customize modal.

**Architecture:** New `email_templates` table with individual design columns (mirroring newsletters). `automated_emails` gets an `email_template_id` FK. New REST endpoint at `/email_templates/` with browse/read/edit. Frontend hooks load and save template via React Query.

**Tech Stack:** Knex migrations, Bookshelf ORM, Express routes, React Query (admin-x-framework), TypeScript

---

### Task 1: Add `email_templates` table to schema.js

**Files:**
- Modify: `ghost/core/core/server/data/schema/schema.js` (insert before `automated_emails` definition around line 1145)

**Step 1: Add the email_templates table definition**

Add this block in `schema.js` immediately before the `automated_emails` definition:

```javascript
email_templates: {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    name: {type: 'string', maxlength: 191, nullable: false, unique: true},
    slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
    header_image: {type: 'string', maxlength: 2000, nullable: true},
    show_publication_title: {type: 'boolean', nullable: false, defaultTo: true},
    show_badge: {type: 'boolean', nullable: false, defaultTo: true},
    footer_content: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
    background_color: {type: 'string', maxlength: 50, nullable: false, defaultTo: '#ffffff'},
    title_font_category: {type: 'string', maxlength: 191, nullable: false, defaultTo: 'sans_serif', validations: {isIn: [['serif', 'sans_serif']]}},
    title_font_weight: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'bold', validations: {isIn: [['normal', 'medium', 'semibold', 'bold']]}},
    body_font_category: {type: 'string', maxlength: 191, nullable: false, defaultTo: 'sans_serif', validations: {isIn: [['serif', 'sans_serif']]}},
    header_background_color: {type: 'string', maxlength: 50, nullable: false, defaultTo: '#ffffff'},
    title_alignment: {type: 'string', maxlength: 191, nullable: false, defaultTo: 'center', validations: {isIn: [['center', 'left']]}},
    post_title_color: {type: 'string', maxlength: 50, nullable: true},
    section_title_color: {type: 'string', maxlength: 50, nullable: true},
    button_color: {type: 'string', maxlength: 50, nullable: true, defaultTo: 'accent'},
    button_style: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'fill', validations: {isIn: [['fill', 'outline']]}},
    button_corners: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'rounded', validations: {isIn: [['square', 'rounded', 'pill']]}},
    link_color: {type: 'string', maxlength: 50, nullable: true, defaultTo: 'accent'},
    link_style: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'underline', validations: {isIn: [['underline', 'regular', 'bold']]}},
    image_corners: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'square', validations: {isIn: [['square', 'rounded']]}},
    divider_color: {type: 'string', maxlength: 50, nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    '@@INDEXES@@': [
        ['slug']
    ]
},
```

**Step 2: Add `email_template_id` FK to `automated_emails`**

In the `automated_emails` table definition (around line 1145), add this column after `sender_reply_to`:

```javascript
email_template_id: {type: 'string', maxlength: 24, nullable: true, references: 'email_templates.id'},
```

**Step 3: Commit**

```bash
git add ghost/core/core/server/data/schema/schema.js
git commit -m "Added email_templates table and email_template_id FK to schema"
```

---

### Task 2: Create migration — add email_templates table

**Files:**
- Create: `ghost/core/core/server/data/migrations/versions/6.19/2026-03-24-12-00-00-add-email-templates-table.js`

**Step 1: Create the migration file**

```javascript
const {addTable} = require('../../utils');

module.exports = addTable('email_templates', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    name: {type: 'string', maxlength: 191, nullable: false, unique: true},
    slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
    header_image: {type: 'string', maxlength: 2000, nullable: true},
    show_publication_title: {type: 'boolean', nullable: false, defaultTo: true},
    show_badge: {type: 'boolean', nullable: false, defaultTo: true},
    footer_content: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
    background_color: {type: 'string', maxlength: 50, nullable: false, defaultTo: '#ffffff'},
    title_font_category: {type: 'string', maxlength: 191, nullable: false, defaultTo: 'sans_serif'},
    title_font_weight: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'bold'},
    body_font_category: {type: 'string', maxlength: 191, nullable: false, defaultTo: 'sans_serif'},
    header_background_color: {type: 'string', maxlength: 50, nullable: false, defaultTo: '#ffffff'},
    title_alignment: {type: 'string', maxlength: 191, nullable: false, defaultTo: 'center'},
    post_title_color: {type: 'string', maxlength: 50, nullable: true},
    section_title_color: {type: 'string', maxlength: 50, nullable: true},
    button_color: {type: 'string', maxlength: 50, nullable: true, defaultTo: 'accent'},
    button_style: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'fill'},
    button_corners: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'rounded'},
    link_color: {type: 'string', maxlength: 50, nullable: true, defaultTo: 'accent'},
    link_style: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'underline'},
    image_corners: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'square'},
    divider_color: {type: 'string', maxlength: 50, nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    '@@INDEXES@@': [
        ['slug']
    ]
});
```

**Step 2: Commit**

```bash
git add ghost/core/core/server/data/migrations/versions/6.19/2026-03-24-12-00-00-add-email-templates-table.js
git commit -m "Added migration to create email_templates table"
```

---

### Task 3: Create migration — add email_template_id column to automated_emails

**Files:**
- Create: `ghost/core/core/server/data/migrations/versions/6.19/2026-03-24-12-00-01-add-email-template-id-to-automated-emails.js`

**Step 1: Create the migration file**

```javascript
const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('automated_emails', 'email_template_id', {
    type: 'string',
    maxlength: 24,
    nullable: true,
    references: 'email_templates.id'
});
```

**Step 2: Commit**

```bash
git add ghost/core/core/server/data/migrations/versions/6.19/2026-03-24-12-00-01-add-email-template-id-to-automated-emails.js
git commit -m "Added migration to add email_template_id FK to automated_emails"
```

---

### Task 4: Create migration — seed default email template

**Files:**
- Create: `ghost/core/core/server/data/migrations/versions/6.19/2026-03-24-12-00-02-seed-default-email-template.js`

**Step 1: Create the seed migration file**

```javascript
const logging = require('@tryghost/logging');
const {default: ObjectID} = require('bson-objectid');
const {createTransactionalMigration} = require('../../utils');

const DEFAULT_TEMPLATE_SLUG = 'default';

module.exports = createTransactionalMigration(
    async function up(knex) {
        const existing = await knex('email_templates')
            .where({slug: DEFAULT_TEMPLATE_SLUG})
            .first();

        if (existing) {
            logging.warn('Default email template already exists, skipping');
            return;
        }

        const templateId = (new ObjectID()).toHexString();

        logging.info('Creating default email template');
        await knex('email_templates').insert({
            id: templateId,
            name: 'Default',
            slug: DEFAULT_TEMPLATE_SLUG,
            created_at: knex.raw('current_timestamp')
        });

        logging.info('Linking existing automated emails to default template');
        await knex('automated_emails')
            .whereNull('email_template_id')
            .update({email_template_id: templateId});
    },
    async function down(knex) {
        logging.info('Unlinking automated emails from default template');
        await knex('automated_emails')
            .update({email_template_id: null});

        logging.info('Deleting default email template');
        await knex('email_templates')
            .where({slug: DEFAULT_TEMPLATE_SLUG})
            .del();
    }
);
```

**Step 2: Commit**

```bash
git add ghost/core/core/server/data/migrations/versions/6.19/2026-03-24-12-00-02-seed-default-email-template.js
git commit -m "Added migration to seed default email template and link automated emails"
```

---

### Task 5: Create EmailTemplate Bookshelf model

**Files:**
- Create: `ghost/core/core/server/models/email-template.js`

**Step 1: Create the model file**

```javascript
const ghostBookshelf = require('./base');

const EmailTemplate = ghostBookshelf.Model.extend({
    tableName: 'email_templates',

    defaults() {
        return {
            show_publication_title: true,
            show_badge: true,
            background_color: '#ffffff',
            title_font_category: 'sans_serif',
            title_font_weight: 'bold',
            body_font_category: 'sans_serif',
            header_background_color: '#ffffff',
            title_alignment: 'center',
            button_color: 'accent',
            button_style: 'fill',
            button_corners: 'rounded',
            link_color: 'accent',
            link_style: 'underline',
            image_corners: 'square'
        };
    },

    automatedEmails() {
        return this.hasMany('AutomatedEmail', 'email_template_id');
    }
});

module.exports = {
    EmailTemplate: ghostBookshelf.model('EmailTemplate', EmailTemplate)
};
```

**Step 2: Add relationship to AutomatedEmail model**

In `ghost/core/core/server/models/automated-email.js`, add this method to the `AutomatedEmail` model extend block (after the `defaults()` method):

```javascript
emailTemplate() {
    return this.belongsTo('EmailTemplate', 'email_template_id');
},
```

**Step 3: Commit**

```bash
git add ghost/core/core/server/models/email-template.js ghost/core/core/server/models/automated-email.js
git commit -m "Added EmailTemplate model and relationship to AutomatedEmail"
```

---

### Task 6: Create email-templates API endpoint

**Files:**
- Create: `ghost/core/core/server/api/endpoints/email-templates.js`
- Modify: `ghost/core/core/server/api/endpoints/index.js` (add getter around line 84, near `automatedEmails`)

**Step 1: Create the endpoint controller**

```javascript
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');

const messages = {
    emailTemplateNotFound: 'Email template not found.'
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'email_templates',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'filter',
            'fields',
            'limit',
            'order',
            'page'
        ],
        permissions: true,
        query(frame) {
            return models.EmailTemplate.findPage(frame.options);
        }
    },

    read: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'filter',
            'fields'
        ],
        data: [
            'id'
        ],
        permissions: true,
        async query(frame) {
            const model = await models.EmailTemplate.findOne(frame.data, frame.options);
            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.emailTemplateNotFound)
                });
            }

            return model;
        }
    },

    edit: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: true,
        async query(frame) {
            const data = frame.data.email_templates[0];
            const model = await models.EmailTemplate.edit(data, frame.options);
            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.emailTemplateNotFound)
                });
            }

            return model;
        }
    }
};

module.exports = controller;
```

**Step 2: Register in endpoints index**

In `ghost/core/core/server/api/endpoints/index.js`, add this getter near the `automatedEmails` getter (around line 84):

```javascript
get emailTemplates() {
    return apiFramework.pipeline(require('./email-templates'), localUtils);
},
```

**Step 3: Commit**

```bash
git add ghost/core/core/server/api/endpoints/email-templates.js ghost/core/core/server/api/endpoints/index.js
git commit -m "Added email_templates API endpoint (browse, read, edit)"
```

---

### Task 7: Add admin API routes for email_templates

**Files:**
- Modify: `ghost/core/core/server/web/api/endpoints/admin/routes.js` (add routes near automated_emails routes around line 194)

**Step 1: Add routes**

Add these lines after the automated_emails routes block:

```javascript
// ## Email Templates
router.get('/email_templates', mw.authAdminApi, http(api.emailTemplates.browse));
router.get('/email_templates/:id', mw.authAdminApi, http(api.emailTemplates.read));
router.put('/email_templates/:id', mw.authAdminApi, http(api.emailTemplates.edit));
```

**Step 2: Commit**

```bash
git add ghost/core/core/server/web/api/endpoints/admin/routes.js
git commit -m "Added admin API routes for email_templates"
```

---

### Task 8: Write E2E API tests for email_templates

**Files:**
- Create: `ghost/core/test/e2e-api/admin/email-templates.test.js`

**Step 1: Write the test file**

```javascript
const {agentProvider, fixtureManager, matchers, dbUtils} = require('../../utils/e2e-framework');
const {anyContentVersion, anyObjectId, anyISODateTime, anyEtag} = matchers;

const matchEmailTemplate = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

describe('Email Templates API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
        await agent.loginAsOwner();
    });

    describe('Browse', function () {
        it('Can browse email templates', async function () {
            await agent
                .get('email_templates')
                .expectStatus(200)
                .matchBodySnapshot({
                    email_templates: [matchEmailTemplate]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });
    });

    describe('Read', function () {
        it('Can read an email template by id', async function () {
            const {body: {email_templates: [template]}} = await agent
                .get('email_templates')
                .expectStatus(200);

            await agent
                .get(`email_templates/${template.id}`)
                .expectStatus(200)
                .matchBodySnapshot({
                    email_templates: [matchEmailTemplate]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Cannot read a non-existent template', async function () {
            await agent
                .get('email_templates/aaaaaaaaaaaaaaaaaaaaaaaa')
                .expectStatus(404)
                .matchBodySnapshot({
                    errors: [{
                        id: anyObjectId
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });
    });

    describe('Edit', function () {
        it('Can edit an email template', async function () {
            const {body: {email_templates: [template]}} = await agent
                .get('email_templates')
                .expectStatus(200);

            await agent
                .put(`email_templates/${template.id}`)
                .body({email_templates: [{
                    background_color: '#f0f0f0',
                    title_font_category: 'serif',
                    button_style: 'outline',
                    show_badge: false,
                    footer_content: 'Custom footer text'
                }]})
                .expectStatus(200)
                .matchBodySnapshot({
                    email_templates: [matchEmailTemplate]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Cannot edit a non-existent template', async function () {
            await agent
                .put('email_templates/aaaaaaaaaaaaaaaaaaaaaaaa')
                .body({email_templates: [{
                    background_color: '#000000'
                }]})
                .expectStatus(404)
                .matchBodySnapshot({
                    errors: [{
                        id: anyObjectId
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });
    });
});
```

**Step 2: Run the tests to verify they pass**

```bash
cd ghost/core && yarn test:e2e test/e2e-api/admin/email-templates.test.js
```

Expected: All tests pass. Snapshot files are auto-generated on first run.

**Step 3: Commit**

```bash
git add ghost/core/test/e2e-api/admin/email-templates.test.js ghost/core/test/e2e-api/admin/__snapshots__/
git commit -m "Added E2E API tests for email_templates endpoint"
```

---

### Task 9: Create frontend API hooks for email_templates

**Files:**
- Create: `apps/admin-x-framework/src/api/email-templates.ts`

**Step 1: Create the TypeScript API file**

```typescript
import {Meta, createMutation, createQuery} from '../utils/api/hooks';
import {updateQueryCache} from '../utils/api/update-queries';

export type EmailTemplate = {
    id: string;
    name: string;
    slug: string;
    header_image: string | null;
    show_publication_title: boolean;
    show_badge: boolean;
    footer_content: string | null;
    background_color: string;
    title_font_category: string;
    title_font_weight: string;
    body_font_category: string;
    header_background_color: string;
    title_alignment: string;
    post_title_color: string | null;
    section_title_color: string | null;
    button_color: string | null;
    button_style: string;
    button_corners: string;
    link_color: string | null;
    link_style: string;
    image_corners: string;
    divider_color: string | null;
    created_at: string;
    updated_at: string | null;
}

export interface EmailTemplatesResponseType {
    meta?: Meta;
    email_templates: EmailTemplate[];
}

const dataType = 'EmailTemplatesResponseType';

export const useBrowseEmailTemplates = createQuery<EmailTemplatesResponseType>({
    dataType,
    path: '/email_templates/'
});

export const useEditEmailTemplate = createMutation<EmailTemplatesResponseType, EmailTemplate>({
    method: 'PUT',
    path: emailTemplate => `/email_templates/${emailTemplate.id}/`,
    body: emailTemplate => ({email_templates: [emailTemplate]}),
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: updateQueryCache('email_templates')
    }
});
```

**Step 2: Commit**

```bash
git add apps/admin-x-framework/src/api/email-templates.ts
git commit -m "Added frontend API hooks for email_templates"
```

---

### Task 10: Wire up the welcome email customize modal to email_templates API

**Files:**
- Modify: `apps/admin-x-settings/src/components/settings/membership/member-emails/welcome-email-customize-modal.tsx`

**Step 1: Update imports and hook up API**

Replace local state initialization with API data loading:

1. Add imports for `useBrowseEmailTemplates` and `useEditEmailTemplate`
2. Load the default template via `useBrowseEmailTemplates()`
3. Initialize `designSettings` and `generalSettings` from the loaded template
4. Update `handleSave` to call `useEditEmailTemplate` mutation instead of the TODO comment

Key changes to the `WelcomeEmailCustomizeModal` component:

- Load template: `const {data: {email_templates: templates} = {email_templates: []}} = useBrowseEmailTemplates();`
- Get first template: `const template = templates[0];`
- Initialize state from template data (with fallbacks to defaults)
- On save: call `editEmailTemplate({...template, ...designSettings, ...generalSettingsAsMapped})`
- Map frontend `GeneralSettings` keys to DB column names (e.g., `showBadge` → `show_badge`)

**Step 2: Run the admin-x-settings tests**

```bash
cd apps/admin-x-settings && yarn test
```

Expected: Tests pass (may need snapshot updates for the new API calls).

**Step 3: Commit**

```bash
git add apps/admin-x-settings/src/components/settings/membership/member-emails/welcome-email-customize-modal.tsx
git commit -m "Wired welcome email customize modal to email_templates API"
```

---

### Task 11: Update automated_emails type to include email_template_id

**Files:**
- Modify: `apps/admin-x-framework/src/api/automated-emails.ts`

**Step 1: Add email_template_id to the AutomatedEmail type**

Add to the `AutomatedEmail` type:

```typescript
email_template_id: string | null;
```

**Step 2: Commit**

```bash
git add apps/admin-x-framework/src/api/automated-emails.ts
git commit -m "Added email_template_id to AutomatedEmail type"
```

---

### Task 12: Final verification

**Step 1: Run Ghost core linting**

```bash
cd ghost/core && yarn lint
```

Expected: No lint errors.

**Step 2: Run Ghost core unit tests**

```bash
cd ghost/core && yarn test:unit
```

Expected: All pass.

**Step 3: Run the email-templates E2E test**

```bash
cd ghost/core && yarn test:e2e test/e2e-api/admin/email-templates.test.js
```

Expected: All pass.

**Step 4: Run admin-x-framework build**

```bash
cd apps/admin-x-framework && yarn build
```

Expected: Builds without errors.
