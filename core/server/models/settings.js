var Settings,
    ghostBookshelf = require('./base'),
    uuid           = require('node-uuid'),
    _              = require('lodash'),
    errors         = require('../errorHandling'),
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
        validation.validateSchema(this.tableName, this.toJSON());
        validation.validateSettings(defaultSettings, this);
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
    read: function (_key) {
        // Allow for just passing the key instead of attributes
        if (!_.isObject(_key)) {
            _key = { key: _key };
        }
        return when(ghostBookshelf.Model.read.call(this, _key)).then(function (element) {
            return element;
        });
    },

    edit: function (_data, t) {
        var settings = this;
        if (!Array.isArray(_data)) {
            _data = [_data];
        }
        return when.map(_data, function (item) {
            // Accept an array of models as input
            if (item.toJSON) { item = item.toJSON(); }
            return settings.forge({ key: item.key }).fetch({transacting: t}).then(function (setting) {

                if (setting) {
                    return setting.set('value', item.value).save(null, {transacting: t});
                }
                return settings.forge({ key: item.key, value: item.value }).save(null, {transacting: t});

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
                    insertOperations.push(Settings.forge(defaultSetting).save());
                }
            });

            return when.all(insertOperations);
        });
    }

});

module.exports = {
    Settings: Settings
};
