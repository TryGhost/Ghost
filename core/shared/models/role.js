(function () {

    "use strict";

    var User = require('./user').User,
        Permission = require('./permission').Permission,
        GhostBookshelf = require('./base'),
        Role,
        Roles;

    Role = GhostBookshelf.Model.extend({
        tableName: 'roles',

        users: function () {
            return this.belongsToMany(User);
        },

        permissions: function () {
            return this.belongsToMany(Permission);
        }
    });

    Roles = GhostBookshelf.Collection.extend({
        model: Role
    });

    module.exports = {
        Role: Role,
        Roles: Roles
    };

}());