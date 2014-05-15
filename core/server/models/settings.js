var Settings,
    ghostBookshelf = require('./base'),
    uuid           = require('node-uuid'),
    _              = require('lodash'),
    errors         = require('../errors'),
    when           = require('when'),
    validation     = require('../data/validation'),

    defaultSettings;

// For neatness, the defaults file is split into categories.
// It's much easier for us to work with it as a single level
// instead of iterating those categories every time
function parseDefaultSettings() {
    var defaultSettingsInCategories = require('../data/default-settings.json'),
        defaultSettingsFlattened = {};

    _.each(defaultSettingsInCategories, function (settings, categoryName) {
        _.each(settings, function (setting, settingName) {
            setting.type = categoryName;
            setting.key = settingName;
            defaultSettingsFlattened[settingName] = setting;
        });
    });

    return defaultSettingsFlattened;
}
defaultSettings = parseDefaultSettings();

// Each setting is saved as a separate row in the database,
// but the overlying API treats them as a single key:value mapping
Settings = ghostBookshelf.Model.extend({

    tableName: 'settings',

    defaults: function () {
        return {
            uuid: uuid.v4(),
            type: 'core'
        };
    },

    validate: function () {
        var self = this;
        return when(validation.validateSchema(self.tableName, self.toJSON())).then(function () {
            return validation.validateSettings(defaultSettings, self);
        });
    },

    saving: function () {
         // disabling sanitization until we can implement a better version
         // All blog setting keys that need their values to be escaped.
         // if (this.get('type') === 'blog' && _.contains(['title', 'description', 'email'], this.get('key'))) {
         //    this.set('value', this.sanitize('value'));
         // }

        return ghostBookshelf.Model.prototype.saving.apply(this, arguments);
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
                add: ['user'],
                edit: ['user']
            };

        if (validOptions[methodName]) {
            options = options.concat(validOptions[methodName]);
        }

        return options;
    },

    findOne: function (options) {
        // Allow for just passing the key instead of attributes
        if (!_.isObject(options)) {
            options = { key: options };
        }
        return when(ghostBookshelf.Model.findOne.call(this, options));
    },

    edit: function (data, options) {
        var self = this;
        options = this.filterOptions(options, 'edit');

        if (!Array.isArray(data)) {
            data = [data];
        }

        return when.map(data, function (item) {
            // Accept an array of models as input
            if (item.toJSON) { item = item.toJSON(); }
            if (!(_.isString(item.key) && item.key.length > 0)) {
                return when.reject(new errors.ValidationError('Setting key cannot be empty.'));
            }

            item = self.filterData(item);

            return Settings.forge({ key: item.key }).fetch(options).then(function (setting) {

                if (setting) {
                    return setting.save({value: item.value}, options);
                }

                return when.reject(new errors.NotFoundError('Unable to find setting to update: ' + item.key));

            }, errors.logAndThrowError);
        });
    },

    populateDefaults: function () {
        return this.findAll().then(function (allSettings) {
            var usedKeys = allSettings.models.map(function (setting) { return setting.get('key'); }),
                insertOperations = [];

            _.each(defaultSettings, function (defaultSetting, defaultSettingKey) {
                var isMissingFromDB = usedKeys.indexOf(defaultSettingKey) === -1;
                // Temporary code to deal with old databases with currentVersion settings
                if (defaultSettingKey === 'databaseVersion' && usedKeys.indexOf('currentVersion') !== -1) {
                    isMissingFromDB = false;
                }
                if (isMissingFromDB) {
                    defaultSetting.value = defaultSetting.defaultValue;
                    insertOperations.push(Settings.forge(defaultSetting).save(null, {user: 1}));
                }
            });

            return when.all(insertOperations);
        });
    }

});

module.exports = {
    Settings: Settings
};
