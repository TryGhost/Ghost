const Promise = require('bluebird');
const _ = require('lodash');
const uuid = require('uuid');
const crypto = require('crypto');
const keypair = require('keypair');
const ObjectID = require('bson-objectid');
const ghostBookshelf = require('./base');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const validator = require('@tryghost/validator');
const urlUtils = require('../../shared/url-utils');
const {WRITABLE_KEYS_ALLOWLIST} = require('../../shared/labs');

const messages = {
    valueCannotBeBlank: 'Value in [settings.key] cannot be blank.',
    unableToFindSetting: 'Unable to find setting to update: {key}',
    notEnoughPermission: 'You do not have permission to perform this action'
};

const internalContext = {context: {internal: true}};
let Settings;
let defaultSettings;

const doBlock = fn => fn();

const getMembersKey = doBlock(() => {
    let UNO_KEYPAIRINO;
    return function getKey(type) {
        if (!UNO_KEYPAIRINO) {
            UNO_KEYPAIRINO = keypair({bits: 1024});
        }
        return UNO_KEYPAIRINO[type];
    };
});

const getGhostKey = doBlock(() => {
    let UNO_KEYPAIRINO;
    return function getKey(type) {
        if (!UNO_KEYPAIRINO) {
            UNO_KEYPAIRINO = keypair({bits: 1024});
        }
        return UNO_KEYPAIRINO[type];
    };
});

// For neatness, the defaults file is split into categories.
// It's much easier for us to work with it as a single level
// instead of iterating those categories every time
function parseDefaultSettings() {
    const defaultSettingsInCategories = require('../data/schema/').defaultSettings;
    const defaultSettingsFlattened = {};

    const dynamicDefault = {
        db_hash: () => uuid.v4(),
        public_hash: () => crypto.randomBytes(15).toString('hex'),
        admin_session_secret: () => crypto.randomBytes(32).toString('hex'),
        theme_session_secret: () => crypto.randomBytes(32).toString('hex'),
        members_public_key: () => getMembersKey('public'),
        members_private_key: () => getMembersKey('private'),
        members_email_auth_secret: () => crypto.randomBytes(64).toString('hex'),
        ghost_public_key: () => getGhostKey('public'),
        ghost_private_key: () => getGhostKey('private')
    };

    _.each(defaultSettingsInCategories, function each(settings, categoryName) {
        _.each(settings, function eachSetting(setting, settingName) {
            setting.group = categoryName;
            setting.key = settingName;

            setting.getDefaultValue = function getDefaultValue() {
                const getDynamicDefault = dynamicDefault[setting.key];
                if (getDynamicDefault) {
                    return getDynamicDefault();
                } else {
                    return setting.defaultValue;
                }
            };

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

    emitChange: function emitChange(event, options) {
        const eventToTrigger = 'settings' + '.' + event;
        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    onDestroyed: function onDestroyed(model, options) {
        ghostBookshelf.Model.prototype.onDestroyed.apply(this, arguments);

        model.emitChange('deleted', options);
        model.emitChange(model._previousAttributes.key + '.' + 'deleted', options);
    },

    onCreated: function onCreated(model, options) {
        ghostBookshelf.Model.prototype.onCreated.apply(this, arguments);

        model.emitChange('added', options);
        model.emitChange(model.attributes.key + '.' + 'added', options);
    },

    onUpdated: function onUpdated(model, options) {
        ghostBookshelf.Model.prototype.onUpdated.apply(this, arguments);

        model.emitChange('edited', options);
        model.emitChange(model.attributes.key + '.' + 'edited', options);
    },

    async onValidate(model, attr, options) {
        await ghostBookshelf.Model.prototype.onValidate.call(this, model, attr, options);

        await Settings.validators.all(model, options);

        if (typeof Settings.validators[model.get('key')] === 'function') {
            await Settings.validators[model.get('key')](model, options);
        }
    },

    format() {
        const attrs = ghostBookshelf.Model.prototype.format.apply(this, arguments);
        const settingType = attrs.type;

        if (settingType === 'boolean') {
            // CASE: Ensure we won't forward strings, otherwise model events or model interactions can fail
            if (attrs.value === '0' || attrs.value === '1') {
                attrs.value = !!+attrs.value;
            }

            // CASE: Ensure we won't forward strings, otherwise model events or model interactions can fail
            if (attrs.value === 'false' || attrs.value === 'true') {
                attrs.value = JSON.parse(attrs.value);
            }

            if (_.isBoolean(attrs.value)) {
                attrs.value = attrs.value.toString();
            }
        }

        return attrs;
    },

    formatOnWrite(attrs) {
        if (attrs.value && ['cover_image', 'logo', 'icon', 'portal_button_icon', 'og_image', 'twitter_image'].includes(attrs.key)) {
            attrs.value = urlUtils.toTransformReady(attrs.value);
        }

        return attrs;
    },

    parse() {
        const attrs = ghostBookshelf.Model.prototype.parse.apply(this, arguments);

        // transform "0" to false for boolean type
        const settingType = attrs.type;
        if (settingType === 'boolean' && (attrs.value === '0' || attrs.value === '1')) {
            attrs.value = !!+attrs.value;
        }

        // transform "false" to false for boolean type
        if (settingType === 'boolean' && (attrs.value === 'false' || attrs.value === 'true')) {
            attrs.value = JSON.parse(attrs.value);
        }

        // transform URLs from __GHOST_URL__ to absolute
        if (['cover_image', 'logo', 'icon', 'portal_button_icon', 'og_image', 'twitter_image'].includes(attrs.key)) {
            attrs.value = urlUtils.transformReadyToAbsolute(attrs.value);
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
        const options = this.filterOptions(unfilteredOptions, 'edit');
        const self = this;

        if (!Array.isArray(data)) {
            data = [data];
        }

        return Promise.map(data, function (item) {
            // Accept an array of models as input
            if (item.toJSON) {
                item = item.toJSON();
            }
            if (!(_.isString(item.key) && item.key.length > 0)) {
                return Promise.reject(new errors.ValidationError({message: tpl(messages.valueCannotBeBlank)}));
            }

            // Ensure that object keys are stringified
            if (_.isObject(item.value)) {
                item.value = JSON.stringify(item.value);
            }

            item = self.filterData(item);

            return Settings.forge({key: item.key}).fetch(options).then(function then(setting) {
                if (setting) {
                    // it's allowed to edit all attributes in case of importing/migrating
                    if (options.importing) {
                        return setting.save(item, options);
                    } else {
                        // If we have a value, set it.
                        if (Object.prototype.hasOwnProperty.call(item, 'value')) {
                            setting.set('value', item.value);
                        }
                        // Internal context can overwrite type (for fixture migrations)
                        if (options.context && options.context.internal && Object.prototype.hasOwnProperty.call(item, 'type')) {
                            setting.set('type', item.type);
                        }

                        // If anything has changed, save the updated model
                        if (setting.hasChanged()) {
                            return setting.save(null, options);
                        }

                        return setting;
                    }
                }

                return Promise.reject(new errors.NotFoundError({message: tpl(messages.unableToFindSetting, {key: item.key})}));
            });
        });
    },

    populateDefaults: async function populateDefaults(unfilteredOptions) {
        const options = this.filterOptions(unfilteredOptions, 'populateDefaults');
        const self = this;

        if (!options.context) {
            options.context = internalContext.context;
        }

        // this is required for sqlite to pick up the columns after db init
        await ghostBookshelf.knex.destroy();
        await ghostBookshelf.knex.initialize();

        const allSettings = await this.findAll(options);

        const usedKeys = allSettings.models.map(function mapper(setting) {
            return setting.get('key');
        });

        const settingsToInsert = [];

        _.each(getDefaultSettings(), function forEachDefault(defaultSetting, defaultSettingKey) {
            const isMissingFromDB = usedKeys.indexOf(defaultSettingKey) === -1;
            if (isMissingFromDB) {
                defaultSetting.value = defaultSetting.getDefaultValue();
                settingsToInsert.push(defaultSetting);
            }
        });

        if (settingsToInsert.length > 0) {
            // fetch available columns to avoid populating columns not yet created by migrations
            const columnInfo = await ghostBookshelf.knex.table('settings').columnInfo();
            const columns = Object.keys(columnInfo);

            // fetch other data that is used when inserting new settings
            const date = ghostBookshelf.knex.raw('CURRENT_TIMESTAMP');
            let owner;
            try {
                owner = await ghostBookshelf.model('User').getOwnerUser();
            } catch (e) {
                // in some tests the owner is deleted and not recreated before setup
                if (e.errorType === 'NotFoundError') {
                    owner = {id: 1};
                } else {
                    throw e;
                }
            }

            const settingsDataToInsert = settingsToInsert.map((setting) => {
                const settingValues = Object.assign({}, setting, {
                    id: ObjectID().toHexString(),
                    created_at: date,
                    created_by: owner.id,
                    updated_at: date,
                    updated_by: owner.id
                });

                return _.pick(settingValues, columns);
            });

            await ghostBookshelf.knex
                .batchInsert('settings', settingsDataToInsert);

            return self.findAll(options);
        }

        return allSettings;
    },

    permissible: function permissible(modelId, action, context, unsafeAttrs, loadedPermissions, hasUserPermission, hasApiKeyPermission) {
        if (hasUserPermission && hasApiKeyPermission) {
            return Promise.resolve();
        }

        return Promise.reject(new errors.NoPermissionError({
            message: tpl(messages.notEnoughPermission)
        }));
    },

    validators: {
        async all(model) {
            const settingName = model.get('key');
            const settingDefault = getDefaultSettings()[settingName];

            if (!settingDefault) {
                return;
            }

            // Basic validations from default-settings.json
            const validationErrors = validator.validate(
                model.get('value'),
                model.get('key'),
                settingDefault.validations,
                'settings'
            );

            if (validationErrors.length) {
                throw new errors.ValidationError({message: validationErrors.join('\n')});
            }
        },
        async labs(model) {
            const flags = JSON.parse(model.get('value'));

            for (const flag in flags) {
                if (!WRITABLE_KEYS_ALLOWLIST.includes(flag)) {
                    throw new errors.ValidationError({
                        message: `Settings lab value cannot have value other then ${WRITABLE_KEYS_ALLOWLIST.join(', ')}`
                    });
                }
            }
        },
        async stripe_plans(model, options) {
            const plans = JSON.parse(model.get('value'));
            for (const plan of plans) {
                // Stripe plans used to be allowed (and defaulted to!) 0 amount plans
                // this causes issues to people importing from older versions of Ghost
                // even if they don't use Members/Stripe
                // issue: https://github.com/TryGhost/Ghost/issues/12049
                if (!options.importing) {
                    // We check 100, not 1, because amounts are in fractional units
                    if (plan.amount < 100 && plan.name !== 'Complimentary') {
                        throw new errors.ValidationError({
                            message: 'Plans cannot have an amount less than 1'
                        });
                    }
                }

                if (typeof plan.name !== 'string') {
                    throw new errors.ValidationError({
                        message: 'Plan must have a name'
                    });
                }

                if (typeof plan.currency !== 'string') {
                    throw new errors.ValidationError({
                        message: 'Plan must have a currency'
                    });
                }

                if (!['year', 'month', 'week', 'day'].includes(plan.interval)) {
                    throw new errors.ValidationError({
                        message: 'Plan interval must be one of: year, month, week or day'
                    });
                }
            }
        },
        // @TODO: Maybe move some of the logic into the members service, exporting an isValidStripeKey
        // method which can be called here, cleaning up the duplication, but not removing control
        async stripe_secret_key(model) {
            const value = model.get('value');
            if (value === null) {
                return;
            }

            const secretKeyRegex = /(?:sk|rk)_(?:test|live)_[\da-zA-Z]{1,247}$/;

            if (!secretKeyRegex.test(value)) {
                throw new errors.ValidationError({
                    message: `stripe_secret_key did not match ${secretKeyRegex}`
                });
            }
        },
        async stripe_publishable_key(model) {
            const value = model.get('value');
            if (value === null) {
                return;
            }

            const publishableKeyRegex = /pk_(?:test|live)_[\da-zA-Z]{1,247}$/;

            if (!publishableKeyRegex.test(value)) {
                throw new errors.ValidationError({
                    message: `stripe_publishable_key did not match ${publishableKeyRegex}`
                });
            }
        },
        async stripe_connect_secret_key(model) {
            const value = model.get('value');
            if (value === null) {
                return;
            }

            const secretKeyRegex = /(?:sk|rk)_(?:test|live)_[\da-zA-Z]{1,247}$/;

            if (!secretKeyRegex.test(value)) {
                throw new errors.ValidationError({
                    message: `stripe_secret_key did not match ${secretKeyRegex}`
                });
            }
        },
        async stripe_connect_publishable_key(model) {
            const value = model.get('value');
            if (value === null) {
                return;
            }

            const publishableKeyRegex = /pk_(?:test|live)_[\da-zA-Z]{1,247}$/;

            if (!publishableKeyRegex.test(value)) {
                throw new errors.ValidationError({
                    message: `stripe_publishable_key did not match ${publishableKeyRegex}`
                });
            }
        }
    }
});

module.exports = {
    Settings: ghostBookshelf.model('Settings', Settings)
};
