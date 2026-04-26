// Shared base-permission dispatcher used by both V1 (can-this.js) and V2
// (can-this-v2.js, parallel-check.js).
//
// Given a parsed context, an action/objectType pair, the loadedPermissions
// envelope (real for V1, synthesized from the static role map for V2), the
// caller's modelOrId/unsafeAttrs, and the optional TargetModel, this:
//
//   1. Computes hasUserPermission/hasApiKeyPermission via computeBasePermission.
//   2. Defers to TargetModel.permissible() when defined (model-level overrides
//      such as Contributor draft rules, owner-immutability, etc).
//   3. Otherwise resolves on allow / rejects with NoPermissionError on deny.
//
// This is the single source of truth for "given perms, what would the chain
// return?" so V1 and V2 cannot drift.

const _ = require('lodash');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const computeBasePermission = require('./compute-base-permission');

const messages = {
    noPermissionToAction: 'You do not have permission to perform this action'
};

function dispatchPermissible({TargetModel, action, objectType, modelOrId, unsafeAttrs, parsedContext, loadedPermissions}) {
    let modelId;
    if (_.isNumber(modelOrId) || _.isString(modelOrId)) {
        modelId = modelOrId;
    } else if (modelOrId) {
        modelId = modelOrId.id;
    }

    const {hasUserPermission, hasApiKeyPermission} = computeBasePermission({
        loadedPermissions,
        actionType: action,
        objectType
    });

    if (TargetModel && _.isFunction(TargetModel.permissible)) {
        return Promise.resolve(TargetModel.permissible(
            modelId, action, parsedContext, unsafeAttrs,
            loadedPermissions, hasUserPermission, hasApiKeyPermission
        ));
    }

    if (hasUserPermission && hasApiKeyPermission) {
        return Promise.resolve();
    }
    return Promise.reject(new errors.NoPermissionError({message: tpl(messages.noPermissionToAction)}));
}

module.exports = dispatchPermissible;
module.exports.messages = messages;
