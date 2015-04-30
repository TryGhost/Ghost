var ghostBookshelf = require('./base'),
    App,
    Apps;

App = ghostBookshelf.Model.extend({
    tableName: 'apps',

    saving: function (newPage, attr, options) {
        /*jshint unused:false*/
        var self = this;

        ghostBookshelf.Model.prototype.saving.apply(this, arguments);

        if (this.hasChanged('slug') || !this.get('slug')) {
            // Pass the new slug through the generator to strip illegal characters, detect duplicates
            return ghostBookshelf.Model.generateSlug(App, this.get('slug') || this.get('name'),
                {transacting: options.transacting})
                .then(function (slug) {
                    self.set({slug: slug});
                });
        }
    },

    permissions: function () {
        return this.belongsToMany('Permission', 'permissions_apps');
    },

    settings: function () {
        return this.belongsToMany('AppSetting', 'app_settings');
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
    App: ghostBookshelf.model('App', App),
    Apps: ghostBookshelf.collection('Apps', Apps)
};
