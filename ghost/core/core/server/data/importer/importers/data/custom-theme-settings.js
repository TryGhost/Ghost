const _ = require('lodash');
const Promise = require('bluebird');
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

    doImport(options, importOptions) {
        debug('doImport', this.modelName, this.dataToImport.length);

        let ops = [];

        _.each(this.dataToImport, (item) => {
            ops.push(models.CustomThemeSetting.findOne({theme: item.theme, key: item.key}, options)
                .then((setting) => {
                    if (_.isObject(item.value)) {
                        item.value = JSON.stringify(item.value);
                    }
                    
                    if (setting) {
                        setting.set('value', item.value);
                        if (setting.hasChanged()) {
                            return setting.save(null, options)
                                .then((importedModel) => {
                                    if (importOptions.returnImportedData) {
                                        this.importedDataToReturn.push(importedModel.toJSON());
                                    }
                                    return importedModel;
                                })
                                .catch((err) => {
                                    return this.handleError(err, item);
                                });
                        }

                        return Promise.resolve();
                    }

                    return models.CustomThemeSetting.add(item, options)
                        .then((importedModel) => {
                            if (importOptions.returnImportedData) {
                                this.importedDataToReturn.push(importedModel.toJSON());
                            }
                            return importedModel;
                        })
                        .catch((err) => {
                            return this.handleError(err, item);
                        });
                })
                .reflect());
        });
        
        const opsPromise = Promise.all(ops);

        // activate function is called to refresh cache when importing custom theme settings for active theme
        opsPromise.then(() => {
            models.Settings.findOne({key: 'active_theme'})
                .then((theme) => {
                    const currentTheme = theme.get('value');
                    if (this.dataToImport.some(themeSetting => themeSetting.theme === currentTheme)) {
                        activate(currentTheme);
                    }
                });
        });

        return opsPromise;
    }
}
module.exports = CustomThemeSettingsImporter;