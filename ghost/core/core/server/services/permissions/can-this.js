const _ = require('lodash');
const models = require('../../models');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const providers = require('./providers');
const parseContext = require('./parse-context');
const actionsMap = require('./actions-map-cache');

const messages = {
    noPermissionToAction: 'You do not have permission to perform this action',
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
                let modelId;
                unsafeAttrs = unsafeAttrs || {};

                // If it's an internal request, resolve immediately
                if (context.internal) {
                    return Promise.resolve();
                }

                if (_.isNumber(modelOrId) || _.isString(modelOrId)) {
                    // It's an id already, do nothing
                    modelId = modelOrId;
                } else if (modelOrId) {
                    // It's a model, get the id
                    modelId = modelOrId.id;
                }
                // Wait for the user loading to finish
                return permissionLoad.then(function (loadedPermissions) {
                    // Iterate through the user permissions looking for an affirmation
                    const userPermissions = loadedPermissions.user ? loadedPermissions.user.permissions : null;
                    const apiKeyPermissions = loadedPermissions.apiKey ? loadedPermissions.apiKey.permissions : null;
                    const memberPermissions = loadedPermissions.member ? loadedPermissions.member.permissions : null;

                    let hasUserPermission;
                    let hasApiKeyPermission;
                    let hasMemberPermission = false;

                    const checkPermission = function (perm) {
                        let permObjId;

                        // Look for a matching action type and object type first
                        if (perm.get('action_type') !== actType || perm.get('object_type') !== objType) {
                            return false;
                        }

                        // Grab the object id (if specified, could be null)
                        permObjId = perm.get('object_id');

                        // If we didn't specify a model (any thing)
                        // or the permission didn't have an id scope set
                        // then the "thing" has permission
                        if (!modelId || !permObjId) {
                            return true;
                        }

                        // Otherwise, check if the id's match
                        // TODO: String vs Int comparison possibility here?
                        return modelId === permObjId;
                    };

                    if (loadedPermissions.user && _.some(loadedPermissions.user.roles, {name: 'Owner'})) {
                        hasUserPermission = true;
                    } else if (!_.isEmpty(userPermissions)) {
                        hasUserPermission = _.some(userPermissions, checkPermission);
                    }

                    if (loadedPermissions.member) {
                        hasMemberPermission = _.some(memberPermissions, checkPermission);
                    }

                    // Check api key permissions if they were passed
                    hasApiKeyPermission = true;
                    if (!_.isNull(apiKeyPermissions)) {
                        // api key request have no user, but we want the user permissions checks to pass
                        hasUserPermission = true;
                        hasApiKeyPermission = _.some(apiKeyPermissions, checkPermission);
                    }

                    // Offer a chance for the TargetModel to override the results
                    if (TargetModel && _.isFunction(TargetModel.permissible)) {
                        return TargetModel.permissible(
                            modelId, actType, context, unsafeAttrs, loadedPermissions, hasUserPermission, hasApiKeyPermission, hasMemberPermission
                        );
                    }

                    if (hasUserPermission && hasApiKeyPermission) {
                        return;
                    }

                    return Promise.reject(new errors.NoPermissionError({message: tpl(messages.noPermissionToAction)}));
                });
            };

            return objTypeHandlers;
        }, {});
    }

    beginCheck(context) {
        const self = this;
        let userPermissionLoad;
        let apiKeyPermissionLoad;
        let memberPermissionLoad;
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

        if (context.member) {
            memberPermissionLoad = providers.member(context.member.id);
        }

        // Wait for both user and app permissions to load
        permissionsLoad = Promise.all([userPermissionLoad, apiKeyPermissionLoad, memberPermissionLoad]).then(function (result) {
            return {
                user: result[0],
                apiKey: result[1],
                member: result[2]
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
