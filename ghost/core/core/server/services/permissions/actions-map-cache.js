// Based heavily on the settings cache
const _ = require('lodash');

let actionsMap = {};

module.exports = {
    getAll: function getAll() {
        return _.cloneDeep(actionsMap);
    },
    init: function init(perms) {
        const seenActions = {};

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
            const actionType = perm.get('action_type');
            const objectType = perm.get('object_type');

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
