// canThis(someUser).edit.posts([id]|[[ids]])
// canThis(someUser).edit.post(somePost|somePostId)

var _                   = require('lodash'),
    Promise             = require('bluebird'),
    Models              = require('../models'),
    effectivePerms      = require('./effective'),
    init,
    refresh,
    canThis,
    CanThisResult,
    exported;

function hasActionsMap() {
    // Just need to find one key in the actionsMap

    return _.any(exported.actionsMap, function (val, key) {
        /*jslint unparam:true*/
        return Object.hasOwnProperty.call(exported.actionsMap, key);
    });
}

// TODO: Move this to its own file so others can use it?
function parseContext(context) {
    // Parse what's passed to canThis.beginCheck for standard user and app scopes
    var parsed = {
            internal: false,
            user: null,
            app: null
        };

    if (context && (context === 'internal' || context.internal)) {
        parsed.internal = true;
    }

    if (context && context.user) {
        parsed.user = context.user;
    }

    if (context && context.app) {
        parsed.app = context.app;
    }

    return parsed;
}

// Base class for canThis call results
CanThisResult = function () {
    return;
};

CanThisResult.prototype.buildObjectTypeHandlers = function (objTypes, actType, context, permissionLoad) {
    var objectTypeModelMap = {
        post:       Models.Post,
        role:       Models.Role,
        user:       Models.User,
        permission: Models.Permission,
        setting:    Models.Settings
    };

    // Iterate through the object types, i.e. ['post', 'tag', 'user']
    return _.reduce(objTypes, function (objTypeHandlers, objType) {
        // Grab the TargetModel through the objectTypeModelMap
        var TargetModel = objectTypeModelMap[objType];

        // Create the 'handler' for the object type;
        // the '.post()' in canThis(user).edit.post()
        objTypeHandlers[objType] = function (modelOrId) {
            var modelId;

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
                var userPermissions = loadedPermissions.user ? loadedPermissions.user.permissions : null,
                    appPermissions = loadedPermissions.app ? loadedPermissions.app.permissions : null,
                    hasUserPermission,
                    hasAppPermission,
                    checkPermission = function (perm) {
                        var permObjId;

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
                // Check user permissions for matching action, object and id.

                if (_.any(loadedPermissions.user.roles, {name: 'Owner'})) {
                    hasUserPermission = true;
                } else if (!_.isEmpty(userPermissions)) {
                    hasUserPermission = _.any(userPermissions, checkPermission);
                }

                // Check app permissions if they were passed
                hasAppPermission = true;
                if (!_.isNull(appPermissions)) {
                    hasAppPermission = _.any(appPermissions, checkPermission);
                }

                // Offer a chance for the TargetModel to override the results
                if (TargetModel && _.isFunction(TargetModel.permissible)) {
                    return TargetModel.permissible(
                        modelId, actType, context, loadedPermissions, hasUserPermission, hasAppPermission
                    );
                }

                if (hasUserPermission && hasAppPermission) {
                    return;
                }

                return Promise.reject();
            });
        };

        return objTypeHandlers;
    }, {});
};

CanThisResult.prototype.beginCheck = function (context) {
    var self = this,
        userPermissionLoad,
        appPermissionLoad,
        permissionsLoad;

    // Get context.user and context.app
    context = parseContext(context);

    if (!hasActionsMap()) {
        throw new Error('No actions map found, please call permissions.init() before use.');
    }

    // Kick off loading of effective user permissions if necessary
    if (context.user) {
        userPermissionLoad = effectivePerms.user(context.user);
    } else {
        // Resolve null if no context.user to prevent db call
        userPermissionLoad = Promise.resolve(null);
    }

    // Kick off loading of effective app permissions if necessary
    if (context.app) {
        appPermissionLoad = effectivePerms.app(context.app);
    } else {
        // Resolve null if no context.app
        appPermissionLoad = Promise.resolve(null);
    }

    // Wait for both user and app permissions to load
    permissionsLoad = Promise.all([userPermissionLoad, appPermissionLoad]).then(function (result) {
        return {
            user: result[0],
            app: result[1]
        };
    });

    // Iterate through the actions and their related object types
    _.each(exported.actionsMap, function (objTypes, actType) {
        // Build up the object type handlers;
        // the '.post()' parts in canThis(user).edit.post()
        var objTypeHandlers = self.buildObjectTypeHandlers(objTypes, actType, context, permissionsLoad);

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
};

canThis = function (context) {
    var result = new CanThisResult();

    return result.beginCheck(context);
};

init = refresh = function () {
    // Load all the permissions
    return Models.Permission.findAll().then(function (perms) {
        var seenActions = {};

        exported.actionsMap = {};

        // Build a hash map of the actions on objects, i.e
        /*
        {
            'edit': ['post', 'tag', 'user', 'page'],
            'delete': ['post', 'user'],
            'create': ['post', 'user', 'page']
        }
        */
        _.each(perms.models, function (perm) {
            var actionType = perm.get('action_type'),
                objectType = perm.get('object_type');

            exported.actionsMap[actionType] = exported.actionsMap[actionType] || [];
            seenActions[actionType] = seenActions[actionType] || {};

            // Check if we've already seen this action -> object combo
            if (seenActions[actionType][objectType]) {
                return;
            }

            exported.actionsMap[actionType].push(objectType);
            seenActions[actionType][objectType] = true;
        });

        return exported.actionsMap;
    });
};

module.exports = exported = {
    init: init,
    refresh: refresh,
    canThis: canThis,
    actionsMap: {}
};
