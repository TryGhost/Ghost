var User           = require('./user').User,
    Permission     = require('./permission').Permission,
    ghostBookshelf = require('./base'),
    Role,
    Roles;

Role = ghostBookshelf.Model.extend({

    tableName: 'roles',

    permittedAttributes: ['id', 'uuid', 'name', 'description', 'created_at', 'created_by', 'updated_at', 'updated_by'],

    validate: function () {
        ghostBookshelf.validator.check(this.get('name'), "Role name cannot be blank").notEmpty();
        ghostBookshelf.validator.check(this.get('description'), "Role description cannot be blank").notEmpty();
    },

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
