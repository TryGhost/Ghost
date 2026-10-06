let actionsMap = Object.freeze({});

module.exports = {
  getAll: function getAll() {
    return Object.fromEntries(
      Object.entries(actionsMap).map(([action, objects]) => [action, [...objects]]),
    );
  },
  init: function init(perms) {
    const objectsByAction = new Map();

    // Build a hash map of the actions on objects, i.e
    /*
         {
         'edit': ['post', 'tag', 'user', 'page'],
         'delete': ['post', 'user'],
         'create': ['post', 'user', 'page']
         }
         */
    for (const perm of perms) {
      const actionType = perm.action_type;
      const objectType = perm.object_type;

      if (!objectsByAction.has(actionType)) {
        objectsByAction.set(actionType, new Set());
      }
      objectsByAction.get(actionType).add(objectType);
    }

    actionsMap = Object.freeze(
      Object.fromEntries(
        [...objectsByAction].map(([action, objects]) => [action, Object.freeze([...objects])]),
      ),
    );

    return actionsMap;
  },
  empty: function empty() {
    return Object.keys(actionsMap).length === 0;
  },
};
