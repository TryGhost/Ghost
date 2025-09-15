const _ = require('lodash');
const models = require('../../models');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const providers = require('./providers');
const parseContext = require('./parse-context');
const actionsMap = require('./actions-map-cache');
const {setIsRoles} = require('../../models/role-utils');

const messages = {
    noPermissionToAction: 'You do not have permission to perform this action',
    noActionsMapFoundError: 'No actions map found, ensure you have loaded permissions into database and then call permissions.init() before use.'
};

class CanThisResult {
    static get objectTypeModelMap() {
        return {
            post: models.Post,
            role: models.Role,
            user: models.User,
            permission: models.Permission,
            setting: models.Settings,
            invite: models.Invite,
            integration: models.Integration,
            comment: models.Comment
        };
    }

    matchesPermission(perm, actType, objType) {
        // Look for a matching action type and object type first
        if (perm.get('action_type') !== actType || perm.get('object_type') !== objType) {
            return false;
        }

        return true;
    }

    checkUserPermissions(loadedPermissions, actType, objType) {
        const userPermissions = loadedPermissions.user ? loadedPermissions.user.permissions : null;
        const apiKeyPermissions = loadedPermissions.apiKey ? loadedPermissions.apiKey.permissions : null;
        const memberPermissions = loadedPermissions.member ? loadedPermissions.member.permissions : null;

        let hasUserPermission;
        let hasApiKeyPermission;
        let hasMemberPermission = false;

        const {isOwner} = setIsRoles(loadedPermissions);
        if (isOwner) {
            hasUserPermission = true;
        } else if (!_.isEmpty(userPermissions)) {
            hasUserPermission = _.some(userPermissions, perm => this.matchesPermission(perm, actType, objType));
        }

        if (loadedPermissions.member) {
            hasMemberPermission = _.some(memberPermissions, perm => this.matchesPermission(perm, actType, objType));
        }

        // Check api key permissions if they were passed
        const apiKeyResult = this.checkApiKeyPermissions(loadedPermissions, apiKeyPermissions, actType, objType);
        if (apiKeyResult.hasUserPermission !== undefined) {
            hasUserPermission = apiKeyResult.hasUserPermission;
        }
        hasApiKeyPermission = apiKeyResult.hasApiKeyPermission;

        return {
            hasUserPermission,
            hasApiKeyPermission,
            hasMemberPermission
        };
    }

    checkApiKeyPermissions(loadedPermissions, apiKeyPermissions, actType, objType) {
        let hasUserPermission;
        let hasApiKeyPermission = true;

        if (!_.isNull(apiKeyPermissions)) {
            if (loadedPermissions.user) {
                // Staff API key scenario: both user and API key present
                // Use USER permissions and ignore API key permissions
                hasApiKeyPermission = true; // Allow API key check to pass
            } else {
                // Traditional API key scenario: API key only, no user
                // Use API key permissions as before
                hasUserPermission = true;
                hasApiKeyPermission = _.some(apiKeyPermissions, perm => this.matchesPermission(perm, actType, objType));
            }
        }

        return {hasUserPermission, hasApiKeyPermission};
    }

    extractModelId(modelOrId) {
        if (_.isNumber(modelOrId) || _.isString(modelOrId)) {
            // It's an id already, do nothing
            return modelOrId;
        } else if (modelOrId) {
            // It's a model, get the id
            return modelOrId.id;
        }
        return undefined;
    }

    buildObjectTypeHandlers(objTypes, actType, context, permissionLoad) {
        const self = this;

        // Iterate through the object types, i.e. ['post', 'tag', 'user']
        return _.reduce(objTypes, function (objTypeHandlers, objType) {
            // Grab the TargetModel through the objectTypeModelMap
            const TargetModel = CanThisResult.objectTypeModelMap[objType];

            // Create the 'handler' for the object type;
            // the '.post()' in canThis(user).edit.post()
            objTypeHandlers[objType] = function (modelOrId, unsafeAttrs) {
                unsafeAttrs = unsafeAttrs || {};

                // If it's an internal request, resolve immediately
                if (context.internal) {
                    return Promise.resolve();
                }

                const modelId = self.extractModelId(modelOrId);
                // Wait for the user loading to finish
                return permissionLoad.then(function (loadedPermissions) {
                    // Check user permissions using extracted method
                    const {hasUserPermission, hasApiKeyPermission, hasMemberPermission} = self.checkUserPermissions(loadedPermissions, actType, objType);

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

    loadPermissions(context) {
        let userPermissionLoad;
        let apiKeyPermissionLoad;
        let memberPermissionLoad;

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
        return Promise.all([userPermissionLoad, apiKeyPermissionLoad, memberPermissionLoad]).then(function (result) {
            return {
                user: result[0],
                apiKey: result[1],
                member: result[2]
            };
        });
    }

    beginCheck(context) {
        const self = this;

        // Get context.user, context.api_key and context.app
        context = parseContext(context);

        if (actionsMap.empty()) {
            throw new errors.InternalServerError({message: tpl(messages.noActionsMapFoundError)});
        }

        // Load all permissions
        const permissionsLoad = this.loadPermissions(context);

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
