const _ = require('lodash');
const debug = require('@tryghost/debug')('importer:roles');
const BaseImporter = require('./base');
const models = require('../../../../models');
const {activate} = require('../../../../services/themes/activate');

class CustomThemeSettingsImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'CustomThemeSetting',
            dataKeyToImport: 'custom_theme_settings'
        });
    }

    beforeImport() {
        debug('beforeImport');
        return super.beforeImport();
    }

    async doImport(options, importOptions) {
        debug('doImport', this.modelName, this.dataToImport.length);

        let reactivateTheme = false;
        let currentTheme;
        // Determine whether to reactivate the current theme after importing settings
        models.Settings.findOne({key: 'active_theme'}).then((theme) => {
            currentTheme = theme.get('value');
            if (this.dataToImport.some(themeSetting => themeSetting.theme === currentTheme)) {
                reactivateTheme = true;
            }
        });

        const importErrors = [];
        let item = this.dataToImport.shift();
        while (item) {
            try {
                const setting = await models.CustomThemeSetting.findOne({theme: item.theme, key: item.key}, options);
                if (_.isObject(item.value)) {
                    item.value = JSON.stringify(item.value);
                }

                if (setting) {
                    setting.set('value', item.value);
                }

                if (setting && !setting.hasChanged()) {
                    // No change to make, pop next entry and continue
                    item = this.dataToImport.shift();
                    continue;
                }

                const importedModel = setting
                    ? await setting.save(null, options)
                    : await models.CustomThemeSetting.add(item, options);

                if (importOptions.returnImportedData) {
                    this.importedDataToReturn.push(importedModel.toJSON());
                }
            } catch (error) {
                if (error) {
                    importErrors.push(...this.handleError(error, item));
                }
            }

            // Shift next entry
            item = this.dataToImport.shift();
        }

        if (reactivateTheme) {
            activate(currentTheme);
        }

        // Ensure array is GCd
        this.dataToImport = null;
        if (importErrors.length > 0) {
            throw importErrors;
        }
    }
}
module.exports = CustomThemeSettingsImporter;
