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
        },
        {
            "uuid":         uuid.v4(),
            "key":          "logo",
            "value":        "",
            "created_by":    1,
            "updated_by":    1,
            "type":         "blog"
        },
        {
            "uuid":         uuid.v4(),
            "key":          "icon",
            "value":        "",
            "created_by":    1,
            "updated_by":    1,
            "type":         "blog"
        }

    ],

    roles: [],

    permissions: [],

    permissions_roles: []
};