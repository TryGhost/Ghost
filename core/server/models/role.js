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
}, {
    /**
    * Returns an array of keys permitted in a method's `options` hash, depending on the current method.
    * @param {String} methodName The name of the method to check valid options for.
    * @return {Array} Keys allowed in the `options` hash of the model's method.
    */
    permittedOptions: function (methodName) {
        var options = ghostBookshelf.Model.permittedOptions(),

            // whitelists for the `options` hash argument on methods, by method name.
            // these are the only options that can be passed to Bookshelf / Knex.
            validOptions = {
                findOne: ['withRelated'],
                add: ['user']
            };

        if (validOptions[methodName]) {
            options = options.concat(validOptions[methodName]);
        }

        return options;
    }
});

Roles = ghostBookshelf.Collection.extend({
    model: Role
});

module.exports = {
    Role: Role,
    Roles: Roles
};
