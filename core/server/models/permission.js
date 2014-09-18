var ghostBookshelf = require('./base'),

    Permission,
    Permissions;

Permission = ghostBookshelf.Model.extend({

    tableName: 'permissions',

    roles: function () {
        return this.belongsToMany('Role');
    },

    users: function () {
        return this.belongsToMany('User');
    },

    apps: function () {
        return this.belongsToMany('App');
    }
});

Permissions = ghostBookshelf.Collection.extend({
    model: Permission
});

module.exports = {
    Permission: ghostBookshelf.model('Permission', Permission),
    Permissions: ghostBookshelf.collection('Permissions', Permissions)
};
