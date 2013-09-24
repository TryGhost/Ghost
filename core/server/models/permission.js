var GhostBookshelf = require('./base'),
    User           = require('./user').User,
    Role           = require('./role').Role,
    Permission,
    Permissions;

Permission = GhostBookshelf.Model.extend({

    tableName: 'permissions',

    permittedAttributes: ['id', 'uuid', 'name', 'object_type', 'action_type', 'object_id', 'created_at', 'created_by',
            'updated_at', 'updated_by'],


    validate: function () {
        // TODO: validate object_type, action_type and object_id
        GhostBookshelf.validator.check(this.get('name'), "Permission name cannot be blank").notEmpty();
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