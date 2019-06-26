const Promise = require('bluebird'),
    _ = require('lodash'),
    uuid = require('uuid'),
    crypto = require('crypto'),
    ghostBookshelf = require('./base'),
    common = require('../lib/common'),
    validation = require('../data/validation'),
    internalContext = {context: {internal: true}};

let Settings, defaultSettings;

const doBlock = fn => fn();

const keypair = (bits) => {
    const keypairModule = doBlock(() => {
        try {
            return require('rsa-keypair').generate;
        } catch (e) {
            return bits => require('keypair')({bits});
        }
    });

    const {public, private, publicKey, privateKey} = keypairModule(bits);

    return {
        publicKey: public || publicKey.toString(),
        privateKey: private || privateKey.toString()
    };
};

// For neatness, the defaults file is split into categories.
// It's much easier for us to work with it as a single level
// instead of iterating those categories every time
function parseDefaultSettings() {
    var defaultSettingsInCategories = require('../data/schema/').defaultSettings,
        defaultSettingsFlattened = {},
        dynamicDefault = {
            db_hash: uuid.v4(),
            public_hash: crypto.randomBytes(15).toString('hex'),
            // @TODO: session_secret would ideally be named "admin_session_secret"
            session_secret: crypto.randomBytes(32).toString('hex'),
            members_session_secret: crypto.randomBytes(32).toString('hex'),
            theme_session_secret: crypto.randomBytes(32).toString('hex')
        };

    const membersKeypair = keypair(1024);

    dynamicDefault.members_public_key = membersKeypair.publicKey;
    dynamicDefault.members_private_key = membersKeypair.privateKey;

    _.each(defaultSettingsInCategories, function each(settings, categoryName) {
        _.each(settings, function each(setting, settingName) {
            setting.type = categoryName;
            setting.key = settingName;
            if (dynamicDefault[setting.key]) {
                setting.defaultValue = dynamicDefault[setting.key];
            }

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

    emitChange: function emitChange(event, options) {
        const eventToTrigger = 'settings' + '.' + event;
        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    onDestroyed: function onDestroyed(model, options) {
        ghostBookshelf.Model.prototype.onDestroyed.apply(this, arguments);

        model.emitChange('deleted', options);
        model.emitChange(model._previousAttributes.key + '.' + 'deleted', options);
    },

    onCreated: function onCreated(model, response, options) {
        ghostBookshelf.Model.prototype.onCreated.apply(this, arguments);

        model.emitChange('added', options);
        model.emitChange(model.attributes.key + '.' + 'added', options);
    },

    onUpdated: function onUpdated(model, response, options) {
        ghostBookshelf.Model.prototype.onUpdated.apply(this, arguments);

        model.emitChange('edited', options);
        model.emitChange(model.attributes.key + '.' + 'edited', options);
    },

    onValidate: function onValidate() {
        var self = this;

        return ghostBookshelf.Model.prototype.onValidate.apply(this, arguments)
            .then(function then() {
                return validation.validateSettings(getDefaultSettings(), self);
            });
    },

    format() {
        const attrs = ghostBookshelf.Model.prototype.format.apply(this, arguments);

        // @NOTE: type TEXT will transform boolean to "0"
        if (_.isBoolean(attrs.value)) {
            attrs.value = attrs.value.toString();
        }

        return attrs;
    },

    parse() {
        const attrs = ghostBookshelf.Model.prototype.parse.apply(this, arguments);

        // transform "0" to false
        // transform "false" to false
        if (attrs.value === '0' || attrs.value === '1') {
            attrs.value = !!+attrs.value;
        }

        if (attrs.value === 'false' || attrs.value === 'true') {
            attrs.value = JSON.parse(attrs.value);
        }

        return attrs;
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

    edit: function (data, unfilteredOptions) {
        var options = this.filterOptions(unfilteredOptions, 'edit'),
            self = this;

        if (!Array.isArray(data)) {
            data = [data];
        }

        return Promise.map(data, function (item) {
            // Accept an array of models as input
            if (item.toJSON) {
                item = item.toJSON();
            }
            if (!(_.isString(item.key) && item.key.length > 0)) {
                return Promise.reject(new common.errors.ValidationError({message: common.i18n.t('errors.models.settings.valueCannotBeBlank')}));
            }

            item = self.filterData(item);

            return Settings.forge({key: item.key}).fetch(options).then(function then(setting) {
                if (setting) {
                    // it's allowed to edit all attributes in case of importing/migrating
                    if (options.importing) {
                        return setting.save(item, options);
                    } else {
                        // If we have a value, set it.
                        if (item.hasOwnProperty('value')) {
                            setting.set('value', item.value);
                        }
                        // Internal context can overwrite type (for fixture migrations)
                        if (options.context && options.context.internal && item.hasOwnProperty('type')) {
                            setting.set('type', item.type);
                        }

                        // If anything has changed, save the updated model
                        if (setting.hasChanged()) {
                            return setting.save(null, options);
                        }

                        return setting;
                    }
                }

                return Promise.reject(new common.errors.NotFoundError({message: common.i18n.t('errors.models.settings.unableToFindSetting', {key: item.key})}));
            });
        });
    },

    populateDefaults: function populateDefaults(unfilteredOptions) {
        var options = this.filterOptions(unfilteredOptions, 'populateDefaults'),
            self = this;

        if (!options.context) {
            options.context = internalContext.context;
        }

        return this
            .findAll(options)
            .then(function checkAllSettings(allSettings) {
                var usedKeys = allSettings.models.map(function mapper(setting) {
                        return setting.get('key');
                    }),
                    insertOperations = [];

                _.each(getDefaultSettings(), function forEachDefault(defaultSetting, defaultSettingKey) {
                    var isMissingFromDB = usedKeys.indexOf(defaultSettingKey) === -1;
                    if (isMissingFromDB) {
                        defaultSetting.value = defaultSetting.defaultValue;
                        insertOperations.push(Settings.forge(defaultSetting).save(null, options));
                    }
                });

                if (insertOperations.length > 0) {
                    return Promise.all(insertOperations).then(function fetchAllToReturn() {
                        return self.findAll(options);
                    });
                }

                return allSettings;
            });
    }
});

module.exports = {
    Settings: ghostBookshelf.model('Settings', Settings)
};
