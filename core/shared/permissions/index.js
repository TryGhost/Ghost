(function () {
    "use strict";

    // canThis(someUser).edit.posts([id]|[[ids]])
    // canThis(someUser).edit.post(somePost|somePostId)

    var _ = require('underscore'),
        when = require('when'),
        Models = require('../models'),
        UserProvider = Models.User,
        PermissionsProvider = Models.Permission,
        init,
        refresh,
        canThis,
        CanThisResult,
        exported;

    // Base class for canThis call results
    CanThisResult = function () {
        this.userPermissionLoad = false;
    };

    CanThisResult.prototype.buildObjectTypeHandlers = function (obj_types, act_type) {
        var self = this,
            obj_type_handlers = {};

        // Iterate through the object types, i.e. ['post', 'tag', 'user']
        _.each(obj_types, function (obj_type) {

            // Create the 'handler' for the object type;
            // the '.post()' in canThis(user).edit.post()
            obj_type_handlers[obj_type] = function (modelOrId) {
                var modelId;

                if (_.isNumber(modelOrId) || _.isString(modelOrId)) {
                    // It's an id already, do nothing
                    modelId = modelOrId;
                } else if (modelOrId) {
                    // It's a model, get the id
                    modelId = modelOrId.id;
                }

                // Wait for the user loading to finish
                return self.userPermissionLoad.then(function (userPermissions) {

                    // Iterate through the user permissions looking for an affirmation
                    var hasPermission = _.any(userPermissions, function (userPermission) {
                            var permObjId;

                            // Look for a matching action type and object type first
                            if (userPermission.get('action_type') !== act_type || userPermission.get('object_type') !== obj_type) {
                                return false;
                            }

                            // Grab the object id (if specified, could be null)
                            permObjId = userPermission.get('object_id');

                            // If we didn't specify a model (any thing)
                            // or the permission didn't have an id scope set
                            // then the user has permission
                            if (!modelId || !permObjId) {
                                return true;
                            }

                            // Otherwise, check if the id's match
                            // TODO: String vs Int comparison possibility here?
                            return modelId === permObjId;
                        });

                    if (hasPermission) {
                        return when.resolve();
                    }

                    return when.reject();
                });
            };
        });

        return obj_type_handlers;
    };

    CanThisResult.prototype.beginCheck = function (user) {
        var self = this;

        // TODO: Switch logic based on object type; user, role, post.

        // Kick off the fetching of the user data
        this.userPermissionLoad = UserProvider.effectivePermissions(user.id || user);

        // Iterate through the actions and their related object types
        // We should have loaded these through a permissions.init() call previously
        // TODO: Throw error if not init() yet?
        _.each(exported.actionsMap, function (obj_types, act_type) {
            // Build up the object type handlers;
            // the '.post()' parts in canThis(user).edit.post()
            var obj_type_handlers = self.buildObjectTypeHandlers(obj_types, act_type);

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

    canThis = function (user) {
        var result = new CanThisResult();

        return result.beginCheck(user);
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

}());