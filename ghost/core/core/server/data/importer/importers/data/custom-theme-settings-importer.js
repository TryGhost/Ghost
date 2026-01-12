const _ = require('lodash');
const debug = require('@tryghost/debug')('importer:roles');
const BaseImporter = require('./base');
const models = require('../../../../models');
const {activate} = require('../../../../services/themes/activate');
const {sequence} = require('@tryghost/promise');

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

        let ops = [];

        _.each(this.dataToImport, (item) => {
            ops.push(async () => {
                const setting = await models.CustomThemeSetting.findOne({theme: item.theme, key: item.key}, options);
                if (_.isObject(item.value)) {
                    item.value = JSON.stringify(item.value);
                }

                if (setting) {
                    setting.set('value', item.value);
                }

                if (setting && !setting.hasChanged()) {
                    return;
                }

                try {
                    const importedModel = setting
                        ? await setting.save(null, options)
                        : await models.CustomThemeSetting.add(item, options);

                    if (importOptions.returnImportedData) {
                        this.importedDataToReturn.push(importedModel.toJSON());
                    }
                } catch (err) {
                    this.handleError(err, item);
                }
            });
        });

        await sequence(ops);

        models.Settings.findOne({key: 'active_theme'}).then((theme) => {
            const currentTheme = theme.get('value');
            if (this.dataToImport.some(themeSetting => themeSetting.theme === currentTheme)) {
                activate(currentTheme);
            }
        });
    }
}
module.exports = CustomThemeSettingsImporter;
