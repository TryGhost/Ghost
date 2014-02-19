var ghostBookshelf = require('./base'),
    _              = require('lodash'),
    when           = require('when'),
    User           = require('./user').User,
    Role           = require('./role').Role,
    App            = require('./app').App,
    validation     = require('../data/validation'),

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