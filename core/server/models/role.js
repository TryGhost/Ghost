var User = require('./user').User,
    Permission = require('./permission').Permission,
    GhostBookshelf = require('./base'),
    Role,
    Roles;

Role = GhostBookshelf.Model.extend({
    tableName: 'roles',

    permittedAttributes: ['id', 'name', 'description'],

    initialize: function () {
        this.on('saving', this.saving, this);
        this.on('saving', this.validate, this);
    },

    validate: function () {
        GhostBookshelf.validator.check(this.get('name'), "Role name cannot be blank").notEmpty();
        GhostBookshelf.validator.check(this.get('description'), "Role description cannot be blank").notEmpty();
    },

    saving: function () {
        // Deal with the related data here

        // Remove any properties which don't belong on the post model
        this.attributes = this.pick(this.permittedAttributes);
    },

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
