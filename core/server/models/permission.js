var GhostBookshelf = require('./base'),
    User = require('./user').User,
    Role = require('./role').Role,
    Permission,
    Permissions;

Permission = GhostBookshelf.Model.extend({
    tableName: 'permissions',

    permittedAttributes: ['id', 'name', 'object_type', 'action_type', 'object_id'],

    initialize: function () {
        this.on('saving', this.saving, this);
        this.on('saving', this.validate, this);
    },

    validate: function () {
        // TODO: validate object_type, action_type and object_id
        GhostBookshelf.validator.check(this.get('name'), "Permission name cannot be blank").notEmpty();
    },

    saving: function () {
        // Deal with the related data here

        // Remove any properties which don't belong on the post model
        this.attributes = this.pick(this.permittedAttributes);
    },

    roles: function () {
        return this.belongsToMany(Role);
    },

    users: function () {
        return this.belongsToMany(User);
    }
});

Permissions = GhostBookshelf.Collection.extend({
    model: Permission
});

module.exports = {
    Permission: Permission,
    Permissions: Permissions
};