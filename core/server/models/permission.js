var ghostBookshelf = require('./base'),

    Permission,
    Permissions;

Permission = ghostBookshelf.Model.extend({

    tableName: 'permissions',

    roles: function roles() {
        return this.belongsToMany('Role');
    },

    users: function users() {
        return this.belongsToMany('User');
    },

    apps: function apps() {
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
