// CUTOVER: delete this file when the soak ends; switch index.js to require
// can-this-v2.js as `canThis`. The base-permission logic lives in
// `compute-base-permission.js` and `dispatch-permissible.js`, which both V1
// and V2 share — this file is the V1 wrapper that performs the per-request
// DB load via providers.user/apiKey and (during the soak) fires the V2
// comparator as a side effect.

const _ = require('lodash');
const models = require('../../models');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const providers = require('./providers');
const parseContext = require('./parse-context');
const actionsMap = require('./actions-map-cache');
const dispatchPermissible = require('./dispatch-permissible');
const {runParallel} = require('./parallel-check');

const messages = {
    noActionsMapFoundError: 'No actions map found, ensure you have loaded permissions into database and then call permissions.init() before use.'
};

class CanThisResult {
    buildObjectTypeHandlers(objTypes, actType, context, permissionLoad) {
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

        // Iterate through the object types, i.e. ['post', 'tag', 'user']
        return _.reduce(objTypes, function (objTypeHandlers, objType) {
            // Grab the TargetModel through the objectTypeModelMap
            const TargetModel = objectTypeModelMap[objType];

            // Create the 'handler' for the object type;
            // the '.post()' in canThis(user).edit.post()
            objTypeHandlers[objType] = function (modelOrId, unsafeAttrs) {
                unsafeAttrs = unsafeAttrs || {};

                // If it's an internal request, resolve immediately
                if (context.internal) {
                    return Promise.resolve();
                }

                const v1Promise = permissionLoad.then(function (loadedPermissions) {
                    return dispatchPermissible({
                        TargetModel,
                        action: actType,
                        objectType: objType,
                        modelOrId,
                        unsafeAttrs,
                        parsedContext: context,
                        loadedPermissions
                    });
                });

                // CUTOVER: delete this side-effect block when the soak ends.
                // V1's `v1Promise` above is the actual outcome; V2 cannot
                // affect it. Attach to the same `permissionLoad` chain so V2
                // can read the role off V1's loaded permissions without a
                // second DB query. Errors are absorbed inside runParallel.
                permissionLoad.then(function (loadedPermissions) {
                    runParallel(v1Promise, {
                        parsedContext: context,
                        action: actType,
                        objectType: objType,
                        modelOrId,
                        unsafeAttrs,
                        loadedPermissions,
                        TargetModel
                    });
                }, function () {
                    // permissionLoad rejected; nothing for V2 to compare against.
                }).catch(function () {
                    // Defensive: the synchronous body of either branch above
                    // should never throw, but a `.catch` on the detached
                    // chain ensures we never produce an unhandled rejection.
                });

                return v1Promise;
            };

            return objTypeHandlers;
        }, {});
    }

    beginCheck(context) {
        const self = this;
        let userPermissionLoad;
        let apiKeyPermissionLoad;
        let permissionsLoad;

        // Get context.user, context.api_key and context.app
        context = parseContext(context);

        if (actionsMap.empty()) {
            throw new errors.InternalServerError({message: tpl(messages.noActionsMapFoundError)});
        }

        // Kick off loading of user permissions if necessary
        if (context.user) {
            userPermissionLoad = providers.user(context.user);
        } else {
            // Resolve null if no context.user to prevent db call
            userPermissionLoad = Promise.resolve(null);
        }

        // Kick off loading of api key permissions if necessary
        if (context.api_key) {
            apiKeyPermissionLoad = providers.apiKey(context.api_key.id);
        } else {
            // Resolve null if no context.api_key
            apiKeyPermissionLoad = Promise.resolve(null);
        }

        // Wait for both user and api key permissions to load
        permissionsLoad = Promise.all([userPermissionLoad, apiKeyPermissionLoad]).then(function (result) {
            return {
                user: result[0],
                apiKey: result[1]
            };
        });

        // Iterate through the actions and their related object types
        _.each(actionsMap.getAll(), function (objTypes, actType) {
            // Build up the object type handlers;
            // the '.post()' parts in canThis(user).edit.post()
            const objTypeHandlers = self.buildObjectTypeHandlers(objTypes, actType, context, permissionsLoad);

            // Define a property for the action on the result;
            // the '.edit' in canThis(user).edit.post()
            Object.defineProperty(self, actType, {
                writable: false,
                enumerable: false,
                configurable: false,
                value: objTypeHandlers
            });
        });

        // Return this for chaining
        return this;
    }
}

module.exports = function canThis(context) {
    const result = new CanThisResult();

    return result.beginCheck(context);
};
