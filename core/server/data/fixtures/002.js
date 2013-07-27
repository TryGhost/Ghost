var uuid = require('node-uuid');

module.exports = {
    posts: [],

    settings: [
        {
            "uuid":         uuid.v4(),
            "key":          "installedPlugins",
            "value":        "[]",
            "created_by":    1,
            "updated_by":    1,
            "type":         "core"
        }
    ],

    roles: [],

    permissions: [],

    permissions_roles: []
};