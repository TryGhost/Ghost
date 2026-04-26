// canThisV2 — parallel role-based permissions checker.
//
// Same chain interface as can-this.js: `canThisV2(ctx).edit.post(id, attrs)`.
// Difference: derives `loadedPermissions` from the static role map
// (role-permissions.js) instead of querying providers.user/apiKey.
//
// CUTOVER: at the end of the parallel-soak, rename to canThis.js, drop the V2
// suffix, delete the V1 file. The chain's action list is built from
// OBJECT_TYPE_ACTIONS in role-permissions.js (NOT actions-map-cache.js) so
// the cleanup PR can also delete actions-map-cache.js without touching V2.
//
// The chain handlers need to know which role(s) to consult. There are two
// supply paths, in priority order:
//   1. `context.userRoleName` / `context.apiKeyRoleName` — explicit, used by
//      parallel-check.js where V1 has already loaded the role and we want to
//      avoid a second DB query.
//   2. Fallback: try to read role names off rich auth principals attached to
//      `context.user` / `context.api_key` (model objects with eager-loaded
//      roles). Works only if auth middleware pre-loaded them.
// If neither path yields a role, the chain treats the principal as having no
// permissions (fail-closed) and lets parallel-check.js see the divergence.

const _ = require('lodash');
const models = require('../../models');
const parseContext = require('./parse-context');
const dispatchPermissible = require('./dispatch-permissible');
const {synthesizeLoadedPermissions, OBJECT_TYPE_ACTIONS} = require('./role-permissions');

const objectTypeModelMap = {
    post: models.Post,
    role: models.Role,
    user: models.User,
    permission: models.Permission,
    setting: models.Settings,
    invite: models.Invite,
    integration: models.Integration,
    comment: models.Comment
};

// Inverse of OBJECT_TYPE_ACTIONS: { actionType: [objectType, ...] }. Computed
// once at module load. This is what the chain's action.objectType handlers
// are built from — no DB lookup, no actions-map-cache dependency.
const ACTION_TO_OBJECT_TYPES = (() => {
    const map = {};
    for (const [objectType, actions] of Object.entries(OBJECT_TYPE_ACTIONS)) {
        for (const action of actions) {
            if (!map[action]) {
                map[action] = [];
            }
            map[action].push(objectType);
        }
    }
    return Object.freeze(map);
})();

function readRoleFromPrincipal(principal) {
    if (!principal || typeof principal !== 'object') {
        return null;
    }
    if (typeof principal.related === 'function') {
        const rolesCol = principal.related('roles');
        if (rolesCol && rolesCol.models && rolesCol.models.length > 0) {
            return rolesCol.models[0].get('name');
        }
        const roleModel = principal.related('role');
        if (roleModel && typeof roleModel.get === 'function') {
            const name = roleModel.get('name');
            if (name) {
                return name;
            }
        }
    }
    if (Array.isArray(principal.roles) && principal.roles[0] && principal.roles[0].name) {
        return principal.roles[0].name;
    }
    if (principal.role && principal.role.name) {
        return principal.role.name;
    }
    return null;
}

function buildHandler(actionType, objectType, parsedContext, loadedPermissions) {
    const TargetModel = objectTypeModelMap[objectType];
    return function handler(modelOrId, unsafeAttrs) {
        // Internal context bypass — must be the literal first check. Internal
        // calls (migrations, scheduler, fixture loading) carry no user/api_key
        // and must not log spurious denials.
        if (parsedContext.internal) {
            return Promise.resolve();
        }
        return dispatchPermissible({
            TargetModel,
            action: actionType,
            objectType,
            modelOrId,
            unsafeAttrs: unsafeAttrs || {},
            parsedContext,
            loadedPermissions
        });
    };
}

class CanThisV2Result {
    beginCheck(rawContext) {
        const parsedContext = parseContext(rawContext);

        let userRoleName = (rawContext && rawContext.userRoleName) || null;
        let apiKeyRoleName = (rawContext && rawContext.apiKeyRoleName) || null;
        if (!userRoleName && parsedContext.user) {
            userRoleName = readRoleFromPrincipal(rawContext && rawContext.user);
        }
        if (!apiKeyRoleName && parsedContext.api_key) {
            apiKeyRoleName = readRoleFromPrincipal(rawContext && rawContext.api_key);
        }

        const loadedPermissions = synthesizeLoadedPermissions({userRoleName, apiKeyRoleName});

        _.each(ACTION_TO_OBJECT_TYPES, (objectTypes, actionType) => {
            const handlers = {};
            for (const objectType of objectTypes) {
                handlers[objectType] = buildHandler(actionType, objectType, parsedContext, loadedPermissions);
            }
            Object.defineProperty(this, actionType, {
                writable: false,
                enumerable: false,
                configurable: false,
                value: handlers
            });
        });

        return this;
    }
}

module.exports = function canThisV2(context) {
    return new CanThisV2Result().beginCheck(context);
};

module.exports.readRoleFromPrincipal = readRoleFromPrincipal;
module.exports.ACTION_TO_OBJECT_TYPES = ACTION_TO_OBJECT_TYPES;
