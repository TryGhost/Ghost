const debug = require('ghost-ignition').debug('importer:settings'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    BaseImporter = require('./base'),
    models = require('../../../../models'),
    defaultSettings = require('../../../schema/default-settings.json'),
    labsDefaults = JSON.parse(defaultSettings.blog.labs.defaultValue);

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
     * - handle labs setting
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

        const permalinks = _.find(this.dataToImport, {key: 'permalinks'});

        if (permalinks) {
            this.problems.push({
                message: 'Permalink Setting was removed. Please configure permalinks in your routes.yaml.',
                help: this.modelName,
                context: JSON.stringify(permalinks)
            });

            this.dataToImport = _.filter(this.dataToImport, (data) => {
                return data.key !== 'permalinks';
            });
        }

        // Remove core and theme data types
        this.dataToImport = _.filter(this.dataToImport, (data) => {
            return ['core', 'theme'].indexOf(data.type) === -1;
        });

        _.each(this.dataToImport, (obj) => {
            if (obj.key === 'labs' && obj.value) {
                // Overwrite the labs setting with our current defaults
                // Ensures things that are enabled in new versions, are turned on
                obj.value = JSON.stringify(_.assign({}, JSON.parse(obj.value), labsDefaults));
            }

            // CASE: we do not import slack hooks, otherwise it can happen very fast that you are pinging someone's slack channel
            if (obj.key === 'slack') {
                obj.value = JSON.stringify([{url: ''}]);
            }
        });

        return super.beforeImport();
    }

    generateIdentifier() {
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
