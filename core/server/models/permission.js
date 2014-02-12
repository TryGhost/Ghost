var ghostBookshelf = require('./base'),
    _              = require('lodash'),
    when           = require('when'),
    User           = require('./user').User,
    Role           = require('./role').Role,
    App            = require('./app').App,

    Permission,
    Permissions;

Permission = ghostBookshelf.Model.extend({

    tableName: 'permissions',

    validate: function () {
        // TODO: validate object_type, action_type and object_id
        ghostBookshelf.validator.check(this.get('name'), "Permission name cannot be blank").notEmpty();
    },

    roles: function () {
        return this.belongsToMany(Role);
    },

    users: function () {
        return this.belongsToMany(User);
    },

    apps: function () {
        return this.belongsToMany(App);
    }
});

Permissions = ghostBookshelf.Collection.extend({
    model: Permission
});

module.exports = {
    Permission: Permission,
    Permissions: Permissions
};