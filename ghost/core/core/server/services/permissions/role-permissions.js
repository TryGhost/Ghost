const errors = require('@tryghost/errors');

// In-memory role -> permissions map. Replaces the per-request DB lookup that
// providers.user/apiKey perform today. Source-of-truth during the parallel-run
// soak is `data/schema/fixtures/fixtures.json` (relations[0].entries +
// Permission entries) — `role-permissions.test.js` asserts the two stay in sync.

// Per-object_type list of every action_type that exists in fixtures.json's
// Permission section. Used to expand the "all" shorthand below.
const OBJECT_TYPE_ACTIONS = {
    explore: ['read'],
    db: ['exportContent', 'importContent', 'deleteAllContent', 'backupContent'],
    mail: ['send'],
    notification: ['browse', 'add', 'destroy'],
    post: ['browse', 'read', 'edit', 'add', 'destroy', 'publish'],
    setting: ['browse', 'read', 'edit'],
    slug: ['generate'],
    tag: ['browse', 'read', 'edit', 'add', 'destroy'],
    theme: ['browse', 'edit', 'activate', 'readActive', 'add', 'read', 'destroy'],
    user: ['browse', 'read', 'edit', 'add', 'destroy'],
    role: ['assign', 'browse'],
    invite: ['browse', 'read', 'edit', 'add', 'destroy'],
    redirect: ['download', 'upload'],
    webhook: ['add', 'edit', 'destroy'],
    integration: ['browse', 'read', 'edit', 'add', 'destroy'],
    api_key: ['browse', 'read', 'edit', 'add', 'destroy'],
    action: ['browse'],
    member: ['browse', 'read', 'edit', 'add', 'destroy'],
    product: ['browse', 'read', 'edit', 'add', 'destroy'],
    email_preview: ['read', 'sendTestEmail'],
    email: ['browse', 'read', 'retry'],
    label: ['browse', 'read', 'edit', 'add', 'destroy'],
    automated_email: ['browse', 'read', 'edit', 'add', 'destroy'],
    email_design_setting: ['browse', 'read', 'edit', 'add', 'destroy'],
    member_signin_url: ['read'],
    identity: ['read'],
    members_stripe_connect: ['auth'],
    snippet: ['browse', 'read', 'edit', 'add', 'destroy'],
    offer: ['browse', 'read', 'edit', 'add'],
    authentication: ['resetAllPasswords'],
    custom_theme_setting: ['browse', 'edit'],
    newsletter: ['browse', 'read', 'add', 'edit'],
    comment: ['browse', 'read', 'edit', 'add', 'destroy', 'moderate', 'like', 'unlike', 'report'],
    link: ['browse', 'edit'],
    mention: ['browse'],
    collection: ['browse', 'read', 'edit', 'add', 'destroy'],
    recommendation: ['browse', 'read', 'edit', 'add', 'destroy'],
    automation: ['poll']
};

// Mirror of fixtures.json relations[0].entries. The shorthand:
//   "post": "all"            -> every action in OBJECT_TYPE_ACTIONS.post
//   "user": ["browse","read"] -> exactly those actions
// Owner is intentionally not listed here: the existing canThis short-circuits
// Owner via setIsRoles().isOwner before consulting permission lists, so V2
// must do the same and treat Owner as having every (action, object_type) pair.
const ROLE_DECLARATIONS = {
    Administrator: {
        db: 'all', mail: 'all', notification: 'all', post: 'all', setting: 'all',
        slug: 'all', tag: 'all', theme: 'all', user: 'all', role: 'all', invite: 'all',
        redirect: 'all', webhook: 'all', integration: 'all', api_key: 'all', action: 'all',
        member: 'all', product: 'all', label: 'all', automated_email: 'all',
        email_design_setting: 'all', email_preview: 'all', email: 'all',
        member_signin_url: 'read', snippet: 'all', custom_theme_setting: 'all',
        offer: 'all', authentication: 'resetAllPasswords', members_stripe_connect: 'auth',
        newsletter: 'all', explore: 'read', comment: 'all', link: 'all',
        mention: 'browse', collection: 'all', recommendation: 'all', identity: 'read'
    },
    'DB Backup Integration': {db: 'all', member: 'browse'},
    'Scheduler Integration': {post: 'publish', automation: 'poll'},
    'Ghost Explore Integration': {explore: 'read'},
    'Self-Serve Migration Integration': {db: 'importContent', member: 'add', tag: 'read'},
    'Admin Integration': {
        mail: 'all', notification: 'all', post: 'all', setting: 'all', slug: 'all',
        tag: 'all', theme: 'all', user: 'all', role: 'all', invite: 'all',
        redirect: 'all', webhook: 'all', action: 'all', member: 'all', label: 'all',
        automated_email: 'all', email_design_setting: 'all', email_preview: 'all',
        email: 'all', snippet: 'all',
        product: ['browse', 'read', 'add', 'edit'],
        offer: ['browse', 'read', 'add', 'edit'],
        newsletter: ['browse', 'read', 'add', 'edit'],
        explore: 'read', comment: 'all', link: 'all', mention: 'browse',
        collection: 'all', recommendation: 'all', member_signin_url: 'read'
    },
    'Super Editor': {
        notification: 'all', post: 'all', setting: ['browse', 'read'], slug: 'all',
        tag: 'all', user: 'all', role: 'all', invite: 'all',
        theme: ['browse', 'readActive'], email_preview: 'all', email: 'all',
        snippet: 'all', label: ['browse', 'read', 'edit', 'add', 'destroy'],
        product: ['browse', 'read'], newsletter: ['browse', 'read'],
        collection: 'all', recommendation: ['browse', 'read'],
        member: ['browse', 'read', 'add', 'edit', 'destroy'],
        member_signin_url: 'read', offer: ['browse', 'read'], comment: 'all'
    },
    Editor: {
        notification: 'all', post: 'all', setting: ['browse', 'read'], slug: 'all',
        tag: 'all', user: 'all', role: 'all', invite: 'all',
        theme: ['browse', 'readActive'], email_preview: 'all', email: 'all',
        snippet: 'all', label: ['browse', 'read'],
        product: ['browse', 'read'], newsletter: ['browse', 'read'],
        collection: 'all', recommendation: ['browse', 'read']
    },
    Author: {
        post: ['browse', 'read', 'edit', 'add', 'destroy'],
        setting: ['browse', 'read'], slug: 'all',
        tag: ['browse', 'read', 'add'], user: ['browse', 'read'], role: ['browse'],
        theme: ['browse', 'readActive'], email_preview: 'read', email: 'read',
        snippet: ['browse', 'read'], label: ['browse', 'read'],
        product: ['browse', 'read'], newsletter: ['browse', 'read'],
        collection: ['browse', 'read', 'add'], recommendation: ['browse', 'read']
    },
    Contributor: {
        post: ['browse', 'read', 'edit', 'add', 'destroy'],
        setting: ['browse', 'read'], slug: 'all',
        tag: ['browse', 'read'], user: ['browse', 'read'], role: ['browse'],
        theme: ['browse'], email_preview: 'read', email: 'read',
        snippet: ['browse', 'read'],
        collection: ['browse', 'read'], recommendation: ['browse', 'read']
    }
};

const ROLES_WITH_FULL_ACCESS = new Set(['Owner']);

// Deep-freeze so test pollution / runtime mutation cannot widen privileges.
function deepFreeze(obj) {
    if (obj === null || typeof obj !== 'object' || Object.isFrozen(obj)) {
        return obj;
    }
    for (const key of Object.keys(obj)) {
        deepFreeze(obj[key]);
    }
    return Object.freeze(obj);
}

deepFreeze(OBJECT_TYPE_ACTIONS);
deepFreeze(ROLE_DECLARATIONS);

// Pre-compute expanded "action:object" strings per role so getPermissionsForRole
// is O(1) lookup. Stored as plain Set; getPermissionsForRole returns a fresh
// copy each call so callers cannot mutate the shared one. We also validate
// every object_type referenced by every role here, so a typo'd object_type in
// a list-form declaration (e.g. `tagg: ['browse']`) fails fast at module load
// instead of silently producing phantom permissions that never grant access.
const PERMISSIONS_BY_ROLE = new Map();
for (const [roleName, declarations] of Object.entries(ROLE_DECLARATIONS)) {
    const set = new Set();
    for (const [objectType, actionsValue] of Object.entries(declarations)) {
        if (!OBJECT_TYPE_ACTIONS[objectType]) {
            throw new errors.IncorrectUsageError({
                message: `role-permissions: unknown object_type "${objectType}" for role "${roleName}"`
            });
        }
        let actions;
        if (actionsValue === 'all') {
            actions = OBJECT_TYPE_ACTIONS[objectType];
        } else if (typeof actionsValue === 'string') {
            actions = [actionsValue];
        } else {
            actions = actionsValue;
        }
        for (const action of actions) {
            set.add(`${action}:${objectType}`);
        }
    }
    PERMISSIONS_BY_ROLE.set(roleName, set);
}

function getPermissionsForRole(roleName) {
    if (!roleName) {
        return new Set();
    }
    if (ROLES_WITH_FULL_ACCESS.has(roleName)) {
        // Owner: short-circuited in canThis itself; return an empty set here so
        // any caller that forgets the short-circuit still fails closed.
        return new Set();
    }
    const set = PERMISSIONS_BY_ROLE.get(roleName);
    return set ? new Set(set) : new Set();
}

function hasPermission(roleName, action, objectType) {
    if (ROLES_WITH_FULL_ACCESS.has(roleName)) {
        return true;
    }
    const set = PERMISSIONS_BY_ROLE.get(roleName);
    return Boolean(set && set.has(`${action}:${objectType}`));
}

// Synthesize the `loadedPermissions` shape that the existing model
// `permissible(...)` methods (post.js, user.js, role.js, integration.js)
// expect, without touching the database. Returned shape mirrors what
// providers.user / providers.apiKey produce. The minimal stub on each
// permission record responds to `.get(field)` because models read perms via
// Bookshelf's `.get('action_type')` etc.
function synthesizeLoadedPermissions({userRoleName, apiKeyRoleName} = {}) {
    return {
        user: userRoleName ? buildSide(userRoleName) : null,
        apiKey: apiKeyRoleName ? buildSide(apiKeyRoleName) : null
    };
}

function buildSide(roleName) {
    const set = ROLES_WITH_FULL_ACCESS.has(roleName) ? null : PERMISSIONS_BY_ROLE.get(roleName);
    const perms = [];
    if (set) {
        for (const key of set) {
            const [actionType, objectType] = key.split(':');
            perms.push(makePermStub(actionType, objectType));
        }
    }
    return {permissions: perms, roles: [{name: roleName}]};
}

function makePermStub(actionType, objectType) {
    return {
        get(field) {
            if (field === 'action_type') {
                return actionType;
            }
            if (field === 'object_type') {
                return objectType;
            }
            if (field === 'object_id') {
                return null;
            }
            return undefined;
        }
    };
}

function listAllRoles() {
    return [...ROLES_WITH_FULL_ACCESS, ...PERMISSIONS_BY_ROLE.keys()];
}

module.exports = {
    OBJECT_TYPE_ACTIONS,
    ROLE_DECLARATIONS,
    ROLES_WITH_FULL_ACCESS,
    getPermissionsForRole,
    hasPermission,
    synthesizeLoadedPermissions,
    listAllRoles
};
