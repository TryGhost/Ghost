var ghostBookshelf = require('./base'),
    AppSetting     = require('./appSetting'),
    App,
    Apps;

App = ghostBookshelf.Model.extend({
    tableName: 'apps',

    permissions: function () {
        // Have to use the require here because of circular dependencies
        return this.belongsToMany(require('./permission').Permission, 'permissions_apps');
    },

    settings: function () {
        return this.belongsToMany(AppSetting, 'app_settings');
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
                findOne: ['withRelated']
            };

        if (validOptions[methodName]) {
            options = options.concat(validOptions[methodName]);
        }

        return options;
    }
});

Apps = ghostBookshelf.Collection.extend({
    model: App
});

module.exports = {
    App: App,
    Apps: Apps
};
