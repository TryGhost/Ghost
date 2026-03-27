---
name: API permissions
description: Add, edit, remove, or update permission entries and role-permission mappings for Ghost's Admin API. Use this skill whenever the task involves modifying permissions for a Ghost API resource — including creating permission migration files, updating fixtures.json with new permission entries and role mappings, granting existing permissions to additional roles, or removing permissions. Also use when the user mentions "permissions", "role access", "who can access", asks to restrict or grant access to an API endpoint, references the permissions table, or is adding a new Admin API endpoint that needs permission checks. Even if the user frames it as a feature, Linear issue, or API endpoint task, if the implementation requires permission changes, this skill applies.
---

# Ghost API Permissions

## How Permissions Work

Ghost's permission system controls which roles can perform which actions on which resource types. It has three layers:

1. **Permission entries** in the `permissions` table — each is a combination of `action_type` (e.g. `browse`, `read`, `edit`, `add`, `destroy`) and `object_type` (e.g. `post`, `newsletter`, `recommendation`).

2. **Role-permission mappings** in the `permissions_roles` table — these link permissions to roles like `Administrator`, `Editor`, `Author`, `Contributor`, `Admin Integration`, `Super Editor`, etc.

3. **API endpoint declarations** — each endpoint in `ghost/core/core/server/api/endpoints/` has a `permissions` property that tells the framework to check whether the current user's role has the required permission. The framework maps `docName` + method name (e.g. `recommendations` + `browse`) to `object_type` + `action_type` (e.g. `recommendation` + `browse`) by singularizing the `docName`.

When an Admin API request comes in, the pipeline calls `canThis(context)[action][objectType]()` which looks up whether the user's role has a matching permission entry. The Owner role bypasses all permission checks. Internal requests (context.internal) also bypass checks.

### The docName-to-objectType Mapping

The `docName` on the controller (e.g. `recommendations`) is automatically singularized to derive the `object_type` for permission lookups. The singularization logic handles two cases:
- Words ending in `ies` → replace with `y` (e.g. `identities` → `identity`)
- Words ending in `s` → drop the `s` (e.g. `recommendations` → `recommendation`)

The method name on the controller (e.g. `browse`, `read`, `add`, `edit`, `destroy`) maps directly to the `action_type`. You can override this with `permissions: { method: 'add' }` to check a different action.

### Standard Actions

The standard CRUD actions are: `browse`, `read`, `add`, `edit`, `destroy`. Some resources have custom actions like `publish` (posts), `activate` (themes), `auth` (Stripe connect), etc.

### Standard Roles

- **Administrator** — Full access to everything. New permissions almost always include this role.
- **Admin Integration** — External integrations (e.g. Zapier). Usually gets the same permissions as Administrator for resource CRUD, but may have limited access for sensitive operations.
- **Super Editor** — Like Editor but with additional member management and label CRUD capabilities.
- **Editor** — Can manage posts, tags, users, and read-only access to most settings/products/newsletters.
- **Author** — Can manage their own posts, read tags/users/settings, limited access.
- **Contributor** — Most restricted. Can manage their own draft posts, read-only access to tags/users/settings.
- **Owner** — Implicit full access (bypasses all permission checks in code, not in the permissions_roles table).

There are also internal integration roles (`DB Backup Integration`, `Scheduler Integration`, `Ghost Explore Integration`, `Self-Serve Migration Integration`) that have very specific, narrow permissions.

### Permission Name Convention

Permission names follow the pattern `"{Action} {resource plural}"`, e.g.:
- `"Browse recommendations"`
- `"Read recommendations"`
- `"Edit recommendations"`
- `"Add recommendations"`
- `"Delete recommendations"`

Note: the `destroy` action_type uses the name prefix "Delete" (not "Destroy").

## Instructions

### Step 1: Clarify Requirements with the User

Before writing any code, interview the user to understand the full scope. Ask about anything that isn't already clear from their request:

1. **What resource?** — What `object_type` is this for? Is it a new resource or an existing one? If the user is working on a new API endpoint, the `object_type` is derived from the controller's `docName` (singularized — e.g. `docName: 'recommendations'` → `object_type: 'recommendation'`).

2. **What actions?** — Which actions are needed? For a new resource, the default is all five standard CRUD actions (`browse`, `read`, `add`, `edit`, `destroy`). For existing resources, it may be just one or two. Are there any custom actions beyond standard CRUD?

3. **Which roles need access?** — Present the common access patterns and ask which fits:

   - **Admin-only** (e.g. automated emails): Only `Administrator` + `Admin Integration` get access. Use when the resource is a backend/system concern that editors and authors don't need.
   - **Read-widely, write-narrowly** (e.g. recommendations): All roles get `browse`/`read`, only `Administrator` + `Admin Integration` get `add`/`edit`/`destroy`. Use when everyone should see the data but only admins should change it.
   - **Full editorial access** (e.g. posts, tags): `Administrator`, `Admin Integration`, `Editor`, `Super Editor` get full CRUD; `Author` gets most actions; `Contributor` gets limited access. Use for content-related resources that the editorial team works with.
   - **Custom** — If none of these fit, work through each role individually with the user.

4. **Adding or removing?** — Is this adding new permissions, granting existing permissions to additional roles, or revoking/removing permissions?

Explain any options or trade-offs to the user so they can make an informed decision. For example, if they say "editors should have access", clarify whether that means `Editor` only, or also `Super Editor` (which is a superset of Editor and typically gets the same or more permissions).

### Step 2: Plan the Changes

Once requirements are clear, summarize what will change:
- Which permission entries will be created/removed
- Which role-permission mappings will be added/removed
- Which files need updating (migration, fixtures.json, endpoint controller, tests)

Get user confirmation before proceeding.

### Step 3: Create the Migration File

Use the `create-database-migration` skill (invoke it via `/create-database-migration`) to create the migration file. Do not create the migration file manually — always use `cd ghost/core && yarn migrate:create <kebab-case-slug>` to generate the empty migration file with the correct filename and version directory.

The migration should use the permission utility functions from `ghost/core/core/server/data/migrations/utils/permissions.js`.

The key utility functions are:

- **`addPermissionWithRoles(config, roles)`** — Creates a permission and assigns it to roles. This is the most common function for new permissions. Use `combineTransactionalMigrations()` to combine multiple calls.
- **`addPermissionToRole({ permission, role })`** — Assigns an existing permission to a role. Use when the permission already exists but needs to be granted to an additional role.
- **`addPermission(config)`** — Creates a permission without role assignments (rare).
- **`createRemovePermissionMigration(config, roles)`** — Removes role mappings and then deletes the permission. Use when removing permissions entirely.

**Example: Full CRUD permissions for a new resource**

```javascript
const {combineTransactionalMigrations, addPermissionWithRoles} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse automated emails',
        action: 'browse',
        object: 'automated_email'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Read automated emails',
        action: 'read',
        object: 'automated_email'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Edit automated emails',
        action: 'edit',
        object: 'automated_email'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Add automated emails',
        action: 'add',
        object: 'automated_email'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Delete automated emails',
        action: 'destroy',
        object: 'automated_email'
    }, [
        'Administrator',
        'Admin Integration'
    ])
);
```

**Example: Granting an existing permission to an additional role**

```javascript
const {addPermissionToRole} = require('../../utils');

module.exports = addPermissionToRole({
    permission: 'Read identities',
    role: 'Administrator'
});
```

**Example: Read-widely with restricted write access**

```javascript
const {combineTransactionalMigrations, addPermissionWithRoles} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse recommendations',
        action: 'browse',
        object: 'recommendation'
    }, [
        'Administrator',
        'Admin Integration',
        'Editor',
        'Author',
        'Contributor'
    ]),
    addPermissionWithRoles({
        name: 'Read recommendations',
        action: 'read',
        object: 'recommendation'
    }, [
        'Administrator',
        'Admin Integration',
        'Editor',
        'Author',
        'Contributor'
    ]),
    addPermissionWithRoles({
        name: 'Edit recommendations',
        action: 'edit',
        object: 'recommendation'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Add recommendations',
        action: 'add',
        object: 'recommendation'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Delete recommendations',
        action: 'destroy',
        object: 'recommendation'
    }, [
        'Administrator',
        'Admin Integration'
    ])
);
```

### Step 4: Update fixtures.json

Update `ghost/core/core/server/data/schema/fixtures/fixtures.json` so that fresh installs have the correct permissions. There are two sections:

**1. Permission entries** — Add to (or remove from) the `Permission` model's `entries` array:

```json
{
    "name": "Browse automated emails",
    "action_type": "browse",
    "object_type": "automated_email"
}
```

**2. Role-permission relations** — Update the `relations` array under the appropriate roles. The format maps `object_type` to granted `action_type`s:

```json
"Administrator": {
    "automated_email": "all",
    ...
}
```

The value can be:
- `"all"` — grants all defined permissions for that `object_type`
- A single string like `"read"` — grants only that action
- An array like `["browse", "read"]` — grants specific actions

### Step 5: Ensure API Endpoints Have Permission Checks

Every Admin API endpoint method must have a `permissions` property. The framework rejects requests if this property is missing.

```javascript
// Standard: checks permission matching docName + method
permissions: true,

// Skip checking (use very sparingly — only for unauthenticated endpoints)
permissions: false,

// Override which action is checked
permissions: {
    method: 'add'  // e.g. 'check' method uses 'add' permission
},

// Custom permission logic
permissions: async function(frame) {
    // your custom checks
}
```

### Step 6: Test the Migration

```bash
cd ghost/core
yarn knex-migrator migrate --v {version-directory} --force
```

### Step 7: Add E2E Permission Tests

Add e2e-api tests to verify that the correct roles can (and cannot) access the endpoint. Tests live in `ghost/core/test/e2e-api/admin/`.

**Test setup pattern:**

```javascript
const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyErrorId, anyContentVersion} = matchers;

describe('Resource Name', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
        await agent.loginAsOwner();
    });

    // tests...
});
```

**Testing that a role CAN access an endpoint:**

```javascript
describe('As Administrator', function () {
    before(async function () {
        await agent.loginAsAdmin();
    });

    it('can browse resources', async function () {
        await agent
            .get('resources/')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });
});
```

**Testing that a role CANNOT access an endpoint (403):**

```javascript
describe('As Author', function () {
    before(async function () {
        await agent.loginAsAuthor();
    });

    it('cannot browse resources', async function () {
        await agent
            .get('resources/')
            .expectStatus(403)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            });
    });
});
```

**Available login methods on the test agent:**
- `agent.loginAsOwner()`
- `agent.loginAsAdmin()`
- `agent.loginAsEditor()`
- `agent.loginAsAuthor()`
- `agent.loginAsContributor()`

There are also integration token methods: `agent.useBackupAdminAPIKey()`, `agent.useZapierAdminAPIKey()`.

Test both positive (allowed) and negative (denied) cases. At minimum, test that the most privileged role that should have access can use the endpoint, and that the most privileged role that should NOT have access gets a 403.

Run the tests:

```bash
cd ghost/core
yarn test:single test/e2e-api/admin/{test-file-name}
```

### Step 8: Run Unit Tests

```bash
cd ghost/core
yarn test:unit
```

## Key Files

| File | Purpose |
|------|---------|
| `ghost/core/core/server/data/schema/fixtures/fixtures.json` | Default permission entries and role mappings for fresh installs |
| `ghost/core/core/server/data/migrations/utils/permissions.js` | Migration utility functions (`addPermissionWithRoles`, `addPermissionToRole`, `createRemovePermissionMigration`, etc.) |
| `ghost/core/core/server/data/migrations/versions/` | Migration files organized by version |
| `ghost/core/core/server/api/endpoints/utils/permissions.js` | Permission handler that maps `docName` + method to permission checks |
| `ghost/core/core/server/services/permissions/can-this.js` | Core permission checking logic (`canThis(context)[action][objectType]()`) |
| `ghost/core/core/server/services/permissions/parse-context.js` | Parses request context to determine user/api_key/public access |
| `ghost/core/core/server/api/endpoints/` | API endpoint controllers with `permissions` declarations |
