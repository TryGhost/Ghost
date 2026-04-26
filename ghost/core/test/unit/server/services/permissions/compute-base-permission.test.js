const assert = require('node:assert/strict');
const computeBasePermission = require('../../../../../core/server/services/permissions/compute-base-permission');

function perm(actionType, objectType) {
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
        }
    };
}

describe('Permissions: computeBasePermission', function () {
    it('grants when user permissions include the (action, object) pair', function () {
        const result = computeBasePermission({
            loadedPermissions: {
                user: {permissions: [perm('edit', 'post')], roles: [{name: 'Editor'}]},
                apiKey: null
            },
            actionType: 'edit',
            objectType: 'post'
        });
        assert.deepEqual(result, {hasUserPermission: true, hasApiKeyPermission: true});
    });

    it('denies when user permissions do not include the pair', function () {
        const result = computeBasePermission({
            loadedPermissions: {
                user: {permissions: [perm('browse', 'post')], roles: [{name: 'Editor'}]},
                apiKey: null
            },
            actionType: 'edit',
            objectType: 'post'
        });
        assert.deepEqual(result, {hasUserPermission: false, hasApiKeyPermission: true});
    });

    it('Owner gets hasUserPermission=true regardless of permission list', function () {
        const result = computeBasePermission({
            loadedPermissions: {
                user: {permissions: [], roles: [{name: 'Owner'}]},
                apiKey: null
            },
            actionType: 'destroy',
            objectType: 'user'
        });
        assert.equal(result.hasUserPermission, true);
        assert.equal(result.hasApiKeyPermission, true);
    });

    it('staff API key (user + api_key both present): user wins, apiKey check bypassed', function () {
        // User has edit:post; api_key has only browse:post. With staff token
        // semantics, hasUserPermission = true (user grants), hasApiKeyPermission
        // is forced true (api_key check bypassed entirely).
        const result = computeBasePermission({
            loadedPermissions: {
                user: {permissions: [perm('edit', 'post')], roles: [{name: 'Editor'}]},
                apiKey: {permissions: [perm('browse', 'post')], roles: [{name: 'Admin Integration'}]}
            },
            actionType: 'edit',
            objectType: 'post'
        });
        assert.deepEqual(result, {hasUserPermission: true, hasApiKeyPermission: true});
    });

    it('staff API key: user lacks permission -> still denies (api_key check bypassed)', function () {
        // The staff-token semantics specifically say api_key permissions are
        // NOT consulted when a user is also present. So even though the
        // api_key has the permission, the result should be deny.
        const result = computeBasePermission({
            loadedPermissions: {
                user: {permissions: [perm('browse', 'post')], roles: [{name: 'Author'}]},
                apiKey: {permissions: [perm('destroy', 'post')], roles: [{name: 'Admin Integration'}]}
            },
            actionType: 'destroy',
            objectType: 'post'
        });
        assert.equal(result.hasUserPermission, false);
        assert.equal(result.hasApiKeyPermission, true);
    });

    it('api_key-only context (no user): api_key permissions decide', function () {
        const result = computeBasePermission({
            loadedPermissions: {
                user: null,
                apiKey: {permissions: [perm('publish', 'post')], roles: [{name: 'Scheduler Integration'}]}
            },
            actionType: 'publish',
            objectType: 'post'
        });
        assert.deepEqual(result, {hasUserPermission: true, hasApiKeyPermission: true});
    });

    it('api_key-only context, missing permission -> denies via apiKey', function () {
        const result = computeBasePermission({
            loadedPermissions: {
                user: null,
                apiKey: {permissions: [perm('browse', 'post')], roles: [{name: 'Some Integration'}]}
            },
            actionType: 'destroy',
            objectType: 'post'
        });
        assert.equal(result.hasApiKeyPermission, false);
    });
});
