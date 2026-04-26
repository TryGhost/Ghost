// Pure helper extracted from can-this.js's per-handler closure. Given a
// loadedPermissions object (real-DB-backed in V1, statically-synthesized in
// V2) and the action/object pair under check, returns the base
// {hasUserPermission, hasApiKeyPermission} booleans WITHOUT invoking any
// model `permissible()` override.
//
// The original logic in can-this.js (lines 52-101) is preserved exactly:
//
//  - Owner short-circuit: setIsRoles().isOwner forces hasUserPermission=true
//  - Staff API key precedence: when both user AND apiKey are present, USER
//    permissions decide and apiKey permissions are ignored (hasApiKeyPermission=true).
//  - Pure-API-key case: apiKey alone, hasUserPermission=true and apiKey decides.
//  - Otherwise hasApiKeyPermission stays true (no api_key in context).
//
// Returning a flag pair (rather than a boolean) lets the caller still invoke
// the model's `permissible()` for custom logic (contributor draft rules, etc).

const _ = require('lodash');
const {setIsRoles} = require('../../models/role-utils');

function computeBasePermission({loadedPermissions, actionType, objectType}) {
    const userPermissions = loadedPermissions.user ? loadedPermissions.user.permissions : null;
    const apiKeyPermissions = loadedPermissions.apiKey ? loadedPermissions.apiKey.permissions : null;

    let hasUserPermission;
    let hasApiKeyPermission;

    const checkPermission = function (perm) {
        return perm.get('action_type') === actionType && perm.get('object_type') === objectType;
    };

    const {isOwner} = setIsRoles(loadedPermissions);
    if (isOwner) {
        hasUserPermission = true;
    } else if (!_.isEmpty(userPermissions)) {
        hasUserPermission = _.some(userPermissions, checkPermission);
    }

    hasApiKeyPermission = true;
    if (!_.isNull(apiKeyPermissions)) {
        if (loadedPermissions.user) {
            // Staff API key scenario: user wins, apiKey check is bypassed.
            hasApiKeyPermission = true;
        } else {
            hasUserPermission = true;
            hasApiKeyPermission = _.some(apiKeyPermissions, checkPermission);
        }
    }

    return {hasUserPermission, hasApiKeyPermission};
}

module.exports = computeBasePermission;
