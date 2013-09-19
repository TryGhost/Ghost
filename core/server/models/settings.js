var Settings,
    GhostBookshelf = require('./base'),
    validator = GhostBookshelf.validator,
    uuid = require('node-uuid'),
    _ = require('underscore'),
    errors = require('../errorHandling'),
    when = require('when'),
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
Settings = GhostBookshelf.Model.extend({

    tableName: 'settings',

    permittedAttributes: ['id', 'uuid', 'key', 'value', 'type', 'created_at', 'created_by', 'updated_at', 'update_by'],

    defaults: function () {
        return {
            uuid: uuid.v4(),
            type: 'core'
        };
    },


    // Validate default settings using the validator module.
    // Each validation's key is a name and its value is an array of options
    // Use true (boolean) if options aren't applicable
    //
    // eg:
    //      validations: { isUrl: true, len: [20, 40] }
    //
    // will validate that a setting's length is a URL between 20 and 40 chars,
    // available validators: https://github.com/chriso/node-validator#list-of-validation-methods
    validate: function () {
        validator.check(this.get('key'), "Setting key cannot be blank").notEmpty();
        validator.check(this.get('type'), "Setting type cannot be blank").notEmpty();

        var matchingDefault = defaultSettings[this.get('key')];

        if (matchingDefault && matchingDefault.validations) {
            _.each(matchingDefault.validations, function (validationOptions, validationName) {
                var validation = validator.check(this.get('value'));

                if (validationOptions === true) {
                    validationOptions = null;
                }
                if (typeof validationOptions !== 'array') {
                    validationOptions = [validationOptions];
                }

                // equivalent of validation.isSomething(option1, option2)
                validation[validationName].apply(validation, validationOptions);
            }, this);
        }
    }
}, {
    read: function (_key) {
        // Allow for just passing the key instead of attributes
        if (!_.isObject(_key)) {
            _key = { key: _key };
        }
        return GhostBookshelf.Model.read.call(this, _key);
    },

    edit: function (_data) {
        var settings = this;
        if (!Array.isArray(_data)) {
            _data = [_data];
        }
        return when.map(_data, function (item) {
            // Accept an array of models as input
            if (item.toJSON) { item = item.toJSON(); }
            return settings.forge({ key: item.key }).fetch().then(function (setting) {
                if (setting) {
                    return setting.set('value', item.value).save();
                }
                return settings.forge({ key: item.key, value: item.value }).save();

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
