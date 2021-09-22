const _ = require('lodash');
const BREAD = require('./bread');
const debug = require('@tryghost/debug')('custom-theme-settings-service');

module.exports = class CustomThemeSettingsService {
    constructor({model, cache}) {
        this.repository = new BREAD({model});
        this.cache = cache;
    }

    // add/remove/edit theme setting records to match theme settings
    async activateTheme(theme) {
        const knownSettingsCollection = await this.repository.browse({theme: theme.name});
        // convert to JSON so we can use a standard array rather than a bookshelf collection
        let knownSettings = knownSettingsCollection.toJSON();

        const themeSettings = theme.customSettings || {};

        // exit early if there's nothing to sync for this theme
        if (knownSettings.length === 0 && _.isEmpty(themeSettings)) {
            return;
        }

        let removedIds = [];

        // sync any knownSettings that have changed in the theme
        for (const knownSetting of knownSettings) {
            const themeSetting = themeSettings[knownSetting.key];

            const hasBeenRemoved = !themeSetting;
            const hasChangedType = themeSetting && themeSetting.type !== knownSetting.type;

            if (hasBeenRemoved || hasChangedType) {
                debug(`Removing custom theme setting '${theme.name}.${themeSetting.key}' - ${hasBeenRemoved ? 'not found in theme' : 'type changed'}`);
                await this.repository.destroy({id: knownSetting.id});
                removedIds.push(knownSetting.id);
                return;
            }

            // replace value with default if it's not a valid select option
            if (themeSetting.options && !themeSetting.options.includes(knownSetting.value)) {
                debug(`Resetting custom theme setting value '${theme.name}.${themeSetting.key}' - "${knownSetting.value}" is not a valid option`);
                await this.repository.edit({value: themeSetting.default}, {id: knownSetting.id});
            }
        }

        // clean up any removed knownSettings now that we've finished looping over them
        knownSettings = knownSettings.filter(setting => !removedIds.includes(setting.id));

        // add any new settings found in theme (or re-add settings that were removed due to type change)
        const knownSettingsKeys = knownSettings.map(setting => setting.key);

        for (const [key, setting] of Object.entries(themeSettings)) {
            if (!knownSettingsKeys.includes(key)) {
                const newSettingValues = {
                    theme: theme.name,
                    key,
                    type: setting.type,
                    value: setting.default
                };

                debug(`Adding custom theme setting '${theme.name}.${key}'`);
                await this.repository.add(newSettingValues);
            }
        }

        // populate the cache with all key/value pairs for this theme
        this.cache.populateForTheme(theme.name);
    }
};
