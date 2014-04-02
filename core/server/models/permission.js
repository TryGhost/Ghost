var ghostBookshelf = require('./base'),
    User           = require('./user').User,
    Role           = require('./role').Role,
    App            = require('./app').App,

    Permission,
    Permissions;

Permission = ghostBookshelf.Model.extend({

    tableName: 'permissions',

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
