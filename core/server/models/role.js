var User           = require('./user').User,
    Permission     = require('./permission').Permission,
    ghostBookshelf = require('./base'),

    Role,
    Roles;

Role = ghostBookshelf.Model.extend({

    tableName: 'roles',

    users: function () {
        return this.belongsToMany(User);
    },

    permissions: function () {
        return this.belongsToMany(Permission);
    }
});

Roles = ghostBookshelf.Collection.extend({
    model: Role
});

module.exports = {
    Role: Role,
    Roles: Roles
};
