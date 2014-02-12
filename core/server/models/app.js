var ghostBookshelf = require('./base'),
    App,
    Apps;

App = ghostBookshelf.Model.extend({
    tableName: 'apps',

    permittedAttributes: ['id', 'uuid', 'name', 'created_at', 'created_by', 'updated_at', 'updated_by'],

    validate: function () {
        ghostBookshelf.validator.check(this.get('name'), "App name cannot be blank").notEmpty();
    },

    permissions: function () {
        // Have to use the require here because of circular dependencies
        return this.belongsToMany(require('./permission').Permission, 'permissions_apps');
    }
});

Apps = ghostBookshelf.Collection.extend({
    model: App
});

module.exports = {
    App: App,
    Apps: Apps
};
