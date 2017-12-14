// Based heavily on the settings cache
var _ = require('lodash'),
    actionsMap = {};

module.exports = {
    getAll: function getAll() {
        return _.cloneDeep(actionsMap);
    },
    init: function init(perms) {
        var seenActions = {};

        actionsMap = {};

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

            actionsMap[actionType] = actionsMap[actionType] || [];
            seenActions[actionType] = seenActions[actionType] || {};

            // Check if we've already seen this action -> object combo
            if (seenActions[actionType][objectType]) {
                return;
            }

            actionsMap[actionType].push(objectType);
            seenActions[actionType][objectType] = true;
        });

        return actionsMap;
    },
    empty: function empty() {
        return _.size(actionsMap) === 0;
    }
};
