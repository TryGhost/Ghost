const debug = require('@tryghost/debug')('importer:settings');
const Promise = require('bluebird');
const ObjectId = require('bson-objectid').default;
const _ = require('lodash');
const BaseImporter = require('./base');
const models = require('../../../../models');
const defaultSettings = require('../../../schema').defaultSettings;
const keyGroupMapper = require('../../../../api/shared/serializers/input/utils/settings-key-group-mapper');
const keyTypeMapper = require('../../../../api/shared/serializers/input/utils/settings-key-type-mapper');
const {WRITABLE_KEYS_ALLOWLIST} = require('../../../../../shared/labs');

const labsDefaults = JSON.parse(defaultSettings.labs.labs.defaultValue);
const ignoredSettings = ['slack_url', 'members_from_address', 'members_support_address'];

// NOTE: drop support in Ghost 5.0
const deprecatedSupportedSettingsMap = {
    default_locale: 'lang',
    active_timezone: 'timezone',
    ghost_head: 'codeinjection_head',
    ghost_foot: 'codeinjection_foot'
};
const deprecatedSupportedSettingsOneToManyMap = {
    // NOTE: intentionally ignoring slack_url setting
    slack: [{
        from: '[0].username',
        to: {
            key: 'slack_username',
            group: 'slack',
            type: 'string'
        }
    }],
    unsplash: [{
        from: 'isActive',
        to: {
            key: 'unsplash',
            group: 'unsplash',
            type: 'boolean'
        }
    }]
};

const isFalse = (value) => {
    // Catches false, null, undefined, empty string
    if (!value) {
        return true;
    }
    if (value === 'false') {
        return true;
    }
    if (value === '0') {
        return true;
    }
    return false;
};

const isTrue = (value) => {
    if (value === true) {
        return true;
    }
    if (value === 'true') {
        return true;
    }
    if (value === '1') {
        return true;
    }
    return false;
};

class SettingsImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'Settings',
            dataKeyToImport: 'settings'
        });

        this.errorConfig = {
            allowDuplicates: true,
            returnDuplicates: true,
            showNotFoundWarning: false
        };
    }

    /**
     * - 'core' and 'theme' are blacklisted
     */
    beforeImport() {
        debug('beforeImport');

        const activeTheme = _.find(this.dataToImport, {key: 'active_theme'});

        // We don't import themes. You have to upload the theme first.
        if (activeTheme) {
            this.problems.push({
                message: 'Theme not imported, please upload in Settings - Design',
                help: this.modelName,
                context: JSON.stringify(activeTheme)
            });
        }

        // Don't import any old, deprecated or excluded settings
        this.dataToImport = _.filter(this.dataToImport, (data) => {
            return !_.includes(ignoredSettings, data.key);
        });

        // NOTE: import settings removed in v3 and move them to ignored once Ghost v4 changes are done
        this.dataToImport = this.dataToImport.map((data) => {
            if (deprecatedSupportedSettingsMap[data.key]) {
                data.key = deprecatedSupportedSettingsMap[data.key];
            }

            return data;
        });

        for (const key in deprecatedSupportedSettingsOneToManyMap) {
            const deprecatedSetting = this.dataToImport.find(setting => setting.key === key);

            // NOTE: filtering before mapping in case the key name is the same
            this.dataToImport = _.filter(this.dataToImport, data => (key !== data.key));

            if (deprecatedSetting) {
                let deprecatedSettingValue;

                try {
                    deprecatedSettingValue = JSON.parse(deprecatedSetting.value);
                } catch (err) {
                    this.problems.push({
                        message: `Failed to parse the value of ${deprecatedSetting.key} setting value`,
                        help: this.modelName,
                        context: deprecatedSetting
                    });
                }

                if (deprecatedSettingValue) {
                    deprecatedSupportedSettingsOneToManyMap[key].forEach(({from, to}) => {
                        let value = _.isObject(deprecatedSettingValue)
                            ? _.get(deprecatedSettingValue, from)
                            : deprecatedSetting.value;

                        this.dataToImport.push({
                            id: ObjectId().toHexString(),
                            key: to.key,
                            value: value,
                            group: to.group,
                            type: to.type,
                            flags: to.flags || null,
                            created_by: deprecatedSetting.created_by || 1,
                            created_at: deprecatedSetting.created_at,
                            updated_by: deprecatedSetting.updated_by || 1,
                            updated_at: deprecatedSetting.updated_at
                        });
                    });
                }
            }
        }

        // NOTE: keep back compatibility with settings object structure present before migration
        //       ref. https://github.com/TryGhost/Ghost/issues/10318
        this.dataToImport = this.dataToImport.map((data) => {
            // group property wasn't present in previous version of settings
            if (!data.group && data.type) {
                data.group = keyGroupMapper(data.key);
                data.type = keyTypeMapper(data.key);
            }

            // accent_color can be empty pre-4.x
            if (data.key === 'accent_color' && !data.value) {
                data.value = '#15171A';
            }

            // members_allow_free_signup was renamed to members_signup_access in 4.3
            if (data.key === 'members_allow_free_signup') {
                data.key = 'members_signup_access';
                data.value = data.value ? 'all' : 'invite';
                data.type = 'string';
            }

            return data;
        });

        // Remove core and theme data types
        this.dataToImport = _.filter(this.dataToImport, (data) => {
            return ['core', 'theme'].indexOf(data.group) === -1;
        });

        const newIsPrivate = _.find(this.dataToImport, {key: 'is_private'});
        const oldIsPrivate = _.find(this.existingData, {key: 'is_private'});

        this.dataToImport = _.filter(this.dataToImport, (data) => {
            return data.key !== 'is_private';
        });

        this.dataToImport = _.filter(this.dataToImport, (data) => {
            return data.key !== 'password';
        });

        this.dataToImport = _.filter(this.dataToImport, (data) => {
            return !(['members_subscription_settings', 'stripe_connect_integration', 'bulk_email_settings'].includes(data.key));
        });

        // Only show warning if we are importing a private site into a non-private site.
        if (oldIsPrivate && newIsPrivate && isFalse(oldIsPrivate.value) && isTrue(newIsPrivate.value)) {
            this.problems.push({
                message: 'IMPORTANT: Content in this import was previously published on a private Ghost install, but the current site is public. Are your privacy settings up to date?',
                help: this.modelName,
                context: JSON.stringify(newIsPrivate)
            });
        }

        _.each(this.dataToImport, (obj) => {
            if (obj.key === 'labs' && obj.value) {
                const inputLabsValue = JSON.parse(obj.value);
                const filteredLabsValue = {};

                for (const flag in inputLabsValue) {
                    if (WRITABLE_KEYS_ALLOWLIST.includes(flag)) {
                        filteredLabsValue[flag] = inputLabsValue[flag];
                    }
                }

                // Overwrite the labs setting with our current defaults
                // Ensures things that are enabled in new versions, are turned on
                obj.value = JSON.stringify(_.assign({}, filteredLabsValue, labsDefaults));
            }

            // CASE: we do not import "from address" for members settings as that needs to go via validation with magic link
            if ((obj.key === 'members_from_address') || (obj.key === 'members_support_address')) {
                obj.value = null;
            }

            // CASE: export files might contain "0" or "1" for booleans. Model layer needs real booleans.
            // transform "0" to false
            if (obj.value === '0' || obj.value === '1') {
                obj.value = !!+obj.value;
            }

            // CASE: export files might contain "false" or "true" for booleans. Model layer needs real booleans.
            // transform "false" to false
            if (obj.value === 'false' || obj.value === 'true') {
                obj.value = obj.value === 'true';
            }
        });

        return super.beforeImport();
    }

    fetchExisting(modelOptions) {
        return models.Settings.findAll(modelOptions)
            .then((existingData) => {
                this.existingData = existingData.toJSON();
            });
    }

    generateIdentifier() {
        this.stripProperties(['id']);
        return Promise.resolve();
    }

    doImport(options) {
        debug('doImport', this.dataToImport.length);

        let ops = [];

        _.each(this.dataToImport, (model) => {
            ops.push(
                models.Settings.edit(model, options)
                    .catch((err) => {
                        return this.handleError(err, model);
                    })
                    .reflect()
            );
        });

        return Promise.all(ops);
    }
}

module.exports = SettingsImporter;
