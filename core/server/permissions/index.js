// canThis(someUser).edit.posts([id]|[[ids]])
// canThis(someUser).edit.post(somePost|somePostId)

var _                   = require('lodash'),
    when                = require('when'),
    Models              = require('../models'),
    objectTypeModelMap  = require('./objectTypeModelMap'),
    effectivePerms      = require('./effective'),
    PermissionsProvider = Models.Permission,
    init,
    refresh,
    canThis,
    CanThisResult,
    exported;

function hasActionsMap() {
    // Just need to find one key in the actionsMap

    return _.any(exported.actionsMap, function (val, key) {
        /*jslint unparam:true*/
        return Object.hasOwnProperty(key);
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

    // @TODO: Refactor canThis() references to pass { user: id } explicitly instead of primitives.
    if (context && context.id) {
        // Handle passing of just user.id string
        parsed.user = context.id;
    } else if (_.isNumber(context)) {
        // Handle passing of just user id number
        parsed.user = context;
    } else if (_.isObject(context)) {
        // Otherwise, use the new hotness { user: id, app: id } format
        parsed.user = context.user;
        parsed.app = context.app;
    }

    return parsed;
}

// Base class for canThis call results
CanThisResult = function () {
    return;
};

CanThisResult.prototype.buildObjectTypeHandlers = function (obj_types, act_type, context, permissionLoad) {
    // Iterate through the object types, i.e. ['post', 'tag', 'user']
    return _.reduce(obj_types, function (obj_type_handlers, obj_type) {
        // Grab the TargetModel through the objectTypeModelMap
        var TargetModel = objectTypeModelMap[obj_type];

        // Create the 'handler' for the object type;
        // the '.post()' in canThis(user).edit.post()
        obj_type_handlers[obj_type] = function (modelOrId) {
            var modelId;

            // If it's an internal request, resolve immediately
            if (context.internal) {
                return when.resolve();
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
                var userPermissions = loadedPermissions.user,
                    appPermissions = loadedPermissions.app,
                    hasUserPermission,
                    hasAppPermission,
                    checkPermission = function (perm) {
                        var permObjId;

                        // Look for a matching action type and object type first
                        if (perm.get('action_type') !== act_type || perm.get('object_type') !== obj_type) {
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
                if (!_.isEmpty(userPermissions)) {
                    hasUserPermission = _.any(userPermissions, checkPermission);
                }

                // Check app permissions if they were passed
                hasAppPermission = true;
                if (!_.isNull(appPermissions)) {
                    hasAppPermission = _.any(appPermissions, checkPermission);
                }

                if (hasUserPermission && hasAppPermission) {
                    return when.resolve();
                }
                return when.reject();
            }).otherwise(function () {
                // Check for special permissions on the model directly
                if (TargetModel && _.isFunction(TargetModel.permissable)) {
                    return TargetModel.permissable(modelId, context);
                }

                return when.reject();
            });
        };

        return obj_type_handlers;
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
        throw new Error("No actions map found, please call permissions.init() before use.");
    }

    // Kick off loading of effective user permissions if necessary
    if (context.user) {
        userPermissionLoad = effectivePerms.user(context.user);
    } else {
        // Resolve null if no context.user to prevent db call
        userPermissionLoad = when.resolve(null);
    }
    

    // Kick off loading of effective app permissions if necessary
    if (context.app) {
        appPermissionLoad = effectivePerms.app(context.app);
    } else {
        // Resolve null if no context.app
        appPermissionLoad = when.resolve(null);
    }

    // Wait for both user and app permissions to load
    permissionsLoad = when.all([userPermissionLoad, appPermissionLoad]).then(function (result) {
        return {
            user: result[0],
            app: result[1]
        };
    });

    // Iterate through the actions and their related object types
    _.each(exported.actionsMap, function (obj_types, act_type) {
        // Build up the object type handlers;
        // the '.post()' parts in canThis(user).edit.post()
        var obj_type_handlers = self.buildObjectTypeHandlers(obj_types, act_type, context, permissionsLoad);

        // Define a property for the action on the result;
        // the '.edit' in canThis(user).edit.post()
        Object.defineProperty(self, act_type, {
            writable: false,
            enumerable: false,
            configurable: false,
            value: obj_type_handlers
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
    return PermissionsProvider.browse().then(function (perms) {
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
            var action_type = perm.get('action_type'),
                object_type = perm.get('object_type');

            exported.actionsMap[action_type] = exported.actionsMap[action_type] || [];
            seenActions[action_type] = seenActions[action_type] || {};

            // Check if we've already seen this action -> object combo
            if (seenActions[action_type][object_type]) {
                return;
            }

            exported.actionsMap[action_type].push(object_type);
            seenActions[action_type][object_type] = true;
        });

        return when(exported.actionsMap);
    });
};

module.exports = exported = {
    init: init,
    refresh: refresh,
    canThis: canThis,
    actionsMap: {}
};
