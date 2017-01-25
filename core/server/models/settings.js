var Settings,
    ghostBookshelf = require('./base'),
    _              = require('lodash'),
    errors         = require('../errors'),
    Promise        = require('bluebird'),
    validation     = require('../data/validation'),
    events         = require('../events'),
    internalContext = {context: {internal: true}},
    i18n           = require('../i18n'),

    defaultSettings;

// For neatness, the defaults file is split into categories.
// It's much easier for us to work with it as a single level
// instead of iterating those categories every time
function parseDefaultSettings() {
    var defaultSettingsInCategories = require('../data/schema/').defaultSettings,
        defaultSettingsFlattened = {};

    _.each(defaultSettingsInCategories, function each(settings, categoryName) {
        _.each(settings, function each(setting, settingName) {
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

    defaults: function defaults() {
        return {
            type: 'core'
        };
    },

    emitChange: function emitChange(event) {
        events.emit('settings' + '.' + event, this);
    },

    onDestroyed: function onDestroyed(model) {
        model.emitChange('deleted');
        model.emitChange(model.attributes.key + '.' + 'deleted');
    },

    onCreated: function onCreated(model) {
        model.emitChange('added');
        model.emitChange(model.attributes.key + '.' + 'added');
    },

    onUpdated: function onUpdated(model) {
        model.emitChange('edited');
        model.emitChange(model.attributes.key + '.' + 'edited');
    },

    onValidate: function onValidate() {
        var self = this,
            setting = this.toJSON();

        return validation.validateSchema(self.tableName, setting).then(function then() {
            return validation.validateSettings(getDefaultSettings(), self);
        }).then(function () {
            var themeName = setting.value || '';

            if (setting.key !== 'activeTheme') {
                return;
            }

            return validation.validateActiveTheme(themeName);
        });
    }
}, {
    findOne: function (data, options) {
        if (_.isEmpty(data)) {
            options = data;
        }

        // Allow for just passing the key instead of attributes
        if (!_.isObject(data)) {
            data = {key: data};
        }

        return Promise.resolve(ghostBookshelf.Model.findOne.call(this, data, options));
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
                return Promise.reject(new errors.ValidationError({message: i18n.t('errors.models.settings.valueCannotBeBlank')}));
            }

            item = self.filterData(item);

            return Settings.forge({key: item.key}).fetch(options).then(function then(setting) {
                var saveData = {};

                if (setting) {
                    if (item.hasOwnProperty('value')) {
                        saveData.value = item.value;
                    }
                    // Internal context can overwrite type (for fixture migrations)
                    if (options.context && options.context.internal && item.hasOwnProperty('type')) {
                        saveData.type = item.type;
                    }
                    // it's allowed to edit all attributes in case of importing/migrating
                    if (options.importing) {
                        saveData = item;
                    }

                    return setting.save(saveData, options);
                }

                return Promise.reject(new errors.NotFoundError({message: i18n.t('errors.models.settings.unableToFindSetting', {key: item.key})}));
            });
        });
    },

    populateDefault: function (key) {
        if (!getDefaultSettings()[key]) {
            return Promise.reject(new errors.NotFoundError({message: i18n.t('errors.models.settings.unableToFindDefaultSetting', {key: key})}));
        }

        return this.findOne({key: key}).then(function then(foundSetting) {
            if (foundSetting) {
                return foundSetting;
            }

            var defaultSetting = _.clone(getDefaultSettings()[key]);
            defaultSetting.value = defaultSetting.defaultValue;

            return Settings.forge(defaultSetting).save(null, internalContext);
        });
    },

    populateDefaults: function populateDefaults(options) {
        options = options || {};

        options = _.merge({}, options, internalContext);

        return this.findAll(options).then(function then(allSettings) {
            var usedKeys = allSettings.models.map(function mapper(setting) { return setting.get('key'); }),
                insertOperations = [];

            _.each(getDefaultSettings(), function each(defaultSetting, defaultSettingKey) {
                var isMissingFromDB = usedKeys.indexOf(defaultSettingKey) === -1;
                if (isMissingFromDB) {
                    defaultSetting.value = defaultSetting.defaultValue;
                    insertOperations.push(Settings.forge(defaultSetting).save(null, options));
                }
            });

            return Promise.all(insertOperations);
        });
    }

});

module.exports = {
    Settings: ghostBookshelf.model('Settings', Settings)
};
