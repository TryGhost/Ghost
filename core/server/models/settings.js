var Settings,
    ghostBookshelf = require('./base'),
    uuid           = require('node-uuid'),
    _              = require('lodash'),
    errors         = require('../errors'),
    Promise        = require('bluebird'),
    validation     = require('../data/validation'),
    internal       = {context: {internal: true}},

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

function getDefaultSettings() {
    if (!defaultSettings) {
        defaultSettings = parseDefaultSettings();
    }

    return defaultSettings;
}

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
        var self = this,
            setting = this.toJSON();

        return validation.validateSchema(self.tableName, setting).then(function () {
            return validation.validateSettings(getDefaultSettings(), self);
        }).then(function () {
            var themeName = setting.value || '';

            if (setting.key !== 'activeTheme') {
                return;
            }

            return validation.validateActiveTheme(themeName);
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
    findOne: function (options) {
        // Allow for just passing the key instead of attributes
        if (!_.isObject(options)) {
            options = {key: options};
        }
        return Promise.resolve(ghostBookshelf.Model.findOne.call(this, options));
    },

    edit: function (data, options) {
        var self = this;
        options = this.filterOptions(options, 'edit');

        if (!Array.isArray(data)) {
            data = [data];
        }

        return Promise.map(data, function (item) {
            // Accept an array of models as input
            if (item.toJSON) { item = item.toJSON(); }
            if (!(_.isString(item.key) && item.key.length > 0)) {
                return Promise.reject(new errors.ValidationError('Value in [settings.key] cannot be blank.'));
            }

            item = self.filterData(item);

            return Settings.forge({key: item.key}).fetch(options).then(function (setting) {
                if (setting) {
                    return setting.save({value: item.value}, options);
                }

                return Promise.reject(new errors.NotFoundError('Unable to find setting to update: ' + item.key));
            }, errors.logAndThrowError);
        });
    },

    populateDefault: function (key) {
        if (!getDefaultSettings()[key]) {
            return Promise.reject(new errors.NotFoundError('Unable to find default setting: ' + key));
        }

        return this.findOne({key: key}).then(function (foundSetting) {
            if (foundSetting) {
                return foundSetting;
            }

            var defaultSetting = _.clone(getDefaultSettings()[key]);
            defaultSetting.value = defaultSetting.defaultValue;

            return Settings.forge(defaultSetting).save(null, internal);
        });
    },

    populateDefaults: function () {
        return this.findAll().then(function (allSettings) {
            var usedKeys = allSettings.models.map(function (setting) { return setting.get('key'); }),
                insertOperations = [];

            _.each(getDefaultSettings(), function (defaultSetting, defaultSettingKey) {
                var isMissingFromDB = usedKeys.indexOf(defaultSettingKey) === -1;
                // Temporary code to deal with old databases with currentVersion settings
                if (defaultSettingKey === 'databaseVersion' && usedKeys.indexOf('currentVersion') !== -1) {
                    isMissingFromDB = false;
                }
                if (isMissingFromDB) {
                    defaultSetting.value = defaultSetting.defaultValue;
                    insertOperations.push(Settings.forge(defaultSetting).save(null, internal));
                }
            });

            return Promise.all(insertOperations);
        });
    }

});

module.exports = {
    Settings: ghostBookshelf.model('Settings', Settings)
};
