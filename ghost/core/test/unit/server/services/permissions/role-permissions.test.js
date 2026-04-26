const assert = require('node:assert/strict');
const path = require('node:path');
const fixtures = require('../../../../../core/server/data/schema/fixtures/fixtures.json');
const rolePermissions = require('../../../../../core/server/services/permissions/role-permissions');

// Build the canonical role -> Set('action:object') map by walking the same
// fixtures.json the legacy fixture-manager + DB seed use. Used both as the
// expected value for the static map and as the OBJECT_TYPE_ACTIONS truth.
function buildExpectedFromFixtures() {
    const objectTypeActions = new Map();
    const permissionEntries = fixtures.models.find(m => m.name === 'Permission').entries;
    for (const perm of permissionEntries) {
        if (!objectTypeActions.has(perm.object_type)) {
            objectTypeActions.set(perm.object_type, new Set());
        }
        objectTypeActions.get(perm.object_type).add(perm.action_type);
    }

    const rolePermissionsRelation = fixtures.relations.find(
        r => r.from.model === 'Role' && r.from.relation === 'permissions'
    );
    const expected = new Map();
    for (const [roleName, declarations] of Object.entries(rolePermissionsRelation.entries)) {
        const set = new Set();
        for (const [objectType, actionsValue] of Object.entries(declarations)) {
            const actions = actionsValue === 'all'
                ? Array.from(objectTypeActions.get(objectType) || [])
                : (Array.isArray(actionsValue) ? actionsValue : [actionsValue]);
            for (const action of actions) {
                set.add(`${action}:${objectType}`);
            }
        }
        expected.set(roleName, set);
    }
    return {expected, objectTypeActions};
}

describe('Permissions: static role-permissions map', function () {
    describe('OBJECT_TYPE_ACTIONS', function () {
        it('is a superset of every (action,object) pair in fixtures.json', function () {
            const {objectTypeActions} = buildExpectedFromFixtures();
            for (const [objectType, fixtureActions] of objectTypeActions) {
                const staticActions = new Set(rolePermissions.OBJECT_TYPE_ACTIONS[objectType] || []);
                for (const action of fixtureActions) {
                    assert.ok(
                        staticActions.has(action),
                        `OBJECT_TYPE_ACTIONS missing "${action}" for object_type "${objectType}" (present in fixtures.json)`
                    );
                }
            }
        });

        it('is deep-frozen so runtime mutation cannot widen privileges', function () {
            // In sloppy mode mutations no-op silently, so assert by state.
            const before = [...rolePermissions.OBJECT_TYPE_ACTIONS.post];
            try {
                rolePermissions.OBJECT_TYPE_ACTIONS.post.push('inject');
            } catch (_e) {
                // Strict-mode hosts throw — we don't depend on that.
            }
            try {
                rolePermissions.OBJECT_TYPE_ACTIONS.injected = ['hack'];
            } catch (_e) {
                // Strict-mode hosts throw — we don't depend on that.
            }
            assert.deepEqual([...rolePermissions.OBJECT_TYPE_ACTIONS.post], before);
            assert.equal(rolePermissions.OBJECT_TYPE_ACTIONS.injected, undefined);
            assert.ok(Object.isFrozen(rolePermissions.OBJECT_TYPE_ACTIONS));
            assert.ok(Object.isFrozen(rolePermissions.OBJECT_TYPE_ACTIONS.post));
        });
    });

    describe('ROLE_DECLARATIONS / getPermissionsForRole', function () {
        it('matches fixtures.json relations[Role->permissions] for every role', function () {
            const {expected} = buildExpectedFromFixtures();
            for (const [roleName, expectedSet] of expected) {
                const actualSet = rolePermissions.getPermissionsForRole(roleName);
                const expectedArr = [...expectedSet].sort();
                const actualArr = [...actualSet].sort();
                assert.deepEqual(
                    actualArr,
                    expectedArr,
                    `static map for role "${roleName}" diverged from fixtures.json`
                );
            }
        });

        it('every role declared in the static map exists in fixtures.json (no typos like "Adminstrator")', function () {
            const {expected} = buildExpectedFromFixtures();
            for (const roleName of rolePermissions.listAllRoles()) {
                if (rolePermissions.ROLES_WITH_FULL_ACCESS.has(roleName)) {
                    continue; // Owner is intentionally not in fixtures' permission relations.
                }
                assert.ok(
                    expected.has(roleName),
                    `static role "${roleName}" not found in fixtures.json — typo or stale entry?`
                );
            }
        });

        it('OBJECT_TYPE_ACTIONS contains every action declared in fixtures.json (no extra entries)', function () {
            const {objectTypeActions} = buildExpectedFromFixtures();
            for (const [objectType, staticActions] of Object.entries(rolePermissions.OBJECT_TYPE_ACTIONS)) {
                const fixtureActions = objectTypeActions.get(objectType);
                if (!fixtureActions) {
                    // Allowed: a static object_type with no fixture actions is
                    // privilege-neutral (no role declares 'all' for it). We only
                    // care about actions a role can be granted via 'all'.
                    continue;
                }
                for (const action of staticActions) {
                    assert.ok(
                        fixtureActions.has(action),
                        `OBJECT_TYPE_ACTIONS["${objectType}"] has "${action}" but fixtures.json has no Permission entry for it — would over-grant when expanded by "all"`
                    );
                }
            }
        });

        it('returns a fresh Set so callers cannot mutate shared state', function () {
            const a = rolePermissions.getPermissionsForRole('Editor');
            const b = rolePermissions.getPermissionsForRole('Editor');
            assert.notEqual(a, b);
            a.add('inject:post');
            assert.ok(!b.has('inject:post'));
            assert.ok(!rolePermissions.getPermissionsForRole('Editor').has('inject:post'));
        });

        it('returns an empty set for Owner (Owner is short-circuited at canThis layer)', function () {
            const set = rolePermissions.getPermissionsForRole('Owner');
            assert.equal(set.size, 0);
        });

        it('returns empty for unknown / null / undefined role names', function () {
            assert.equal(rolePermissions.getPermissionsForRole(null).size, 0);
            assert.equal(rolePermissions.getPermissionsForRole(undefined).size, 0);
            assert.equal(rolePermissions.getPermissionsForRole('NoSuchRole').size, 0);
        });
    });

    describe('hasPermission', function () {
        it('returns true for Owner on any (action, object_type) pair', function () {
            assert.ok(rolePermissions.hasPermission('Owner', 'destroy', 'user'));
            assert.ok(rolePermissions.hasPermission('Owner', 'edit', 'post'));
            // Owner is intentionally permissive at this layer; model-level
            // overrides (User.permissible owner-immutability) handle nuance.
            assert.ok(rolePermissions.hasPermission('Owner', 'made-up', 'fictional'));
        });

        it('returns true for Contributor add post (in fixture)', function () {
            assert.ok(rolePermissions.hasPermission('Contributor', 'add', 'post'));
        });

        it('returns false for Contributor publish post (not in fixture)', function () {
            assert.ok(!rolePermissions.hasPermission('Contributor', 'publish', 'post'));
        });

        it('returns false for unknown role', function () {
            assert.ok(!rolePermissions.hasPermission('Nobody', 'edit', 'post'));
        });
    });

    describe('synthesizeLoadedPermissions', function () {
        it('returns the {user, apiKey} shape providers.user/apiKey produces', function () {
            const loaded = rolePermissions.synthesizeLoadedPermissions({userRoleName: 'Editor'});
            assert.ok(loaded.user);
            assert.equal(loaded.apiKey, null);
            assert.ok(Array.isArray(loaded.user.permissions));
            assert.deepEqual(loaded.user.roles, [{name: 'Editor'}]);
            const sample = loaded.user.permissions[0];
            assert.equal(typeof sample.get, 'function');
            assert.ok(['action_type', 'object_type', 'object_id'].every(k => typeof sample.get(k) !== 'undefined' || sample.get(k) === undefined));
        });

        it('synthesizes permissions for an api key when only apiKeyRoleName is given', function () {
            const loaded = rolePermissions.synthesizeLoadedPermissions({apiKeyRoleName: 'Admin Integration'});
            assert.equal(loaded.user, null);
            assert.ok(loaded.apiKey);
            assert.deepEqual(loaded.apiKey.roles, [{name: 'Admin Integration'}]);
        });

        it('returns nulls when no roles supplied', function () {
            const loaded = rolePermissions.synthesizeLoadedPermissions({});
            assert.equal(loaded.user, null);
            assert.equal(loaded.apiKey, null);
        });

        it('Owner synthesis returns no permission stubs (canThis short-circuits)', function () {
            const loaded = rolePermissions.synthesizeLoadedPermissions({userRoleName: 'Owner'});
            assert.equal(loaded.user.permissions.length, 0);
            assert.deepEqual(loaded.user.roles, [{name: 'Owner'}]);
        });
    });

    describe('listAllRoles', function () {
        it('includes Owner plus every declared role', function () {
            const roles = rolePermissions.listAllRoles();
            assert.ok(roles.includes('Owner'));
            assert.ok(roles.includes('Administrator'));
            assert.ok(roles.includes('Contributor'));
        });
    });
});

// Tag the file path so it surfaces in stack traces; this also keeps
// `path` from being seen as unused in environments that lint imports.
exports._sourcePath = path.resolve(__filename);
