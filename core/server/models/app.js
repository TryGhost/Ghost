var ghostBookshelf = require('./base'),
    AppSetting     = require('./appSetting'),
    App,
    Apps;

App = ghostBookshelf.Model.extend({
    tableName: 'apps',

    validate: function () {
        ghostBookshelf.validator.check(this.get('name'), "App name cannot be blank").notEmpty();
    },

    permissions: function () {
        // Have to use the require here because of circular dependencies
        return this.belongsToMany(require('./permission').Permission, 'permissions_apps');
    },

    settings: function () {
        return this.belongsToMany(AppSetting, 'app_settings');
    }
});

Apps = ghostBookshelf.Collection.extend({
    model: App
});

module.exports = {
    App: App,
    Apps: Apps
};
