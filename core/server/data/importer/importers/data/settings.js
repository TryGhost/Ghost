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

        // Map legacy keys
        this.legacySettingsKeyValues = {
            isPrivate: 'is_private',
            activeTimezone: 'active_timezone',
            cover: 'cover_image'
        };
    }

    /**
     * - 'core' and 'theme' are blacklisted
     * - clean up legacy plugin setting references
     * - handle labs setting
     */
    beforeImport() {
        debug('beforeImport');

        let ltsActiveTheme = _.find(this.dataToImport, {key: 'activeTheme'});

        // If there is an lts we want to warn user that theme is not imported
        if (ltsActiveTheme) {
            this.problems.push({
                message: 'Theme not imported, please upload in Settings - Design',
                help: this.modelName,
                context: JSON.stringify(ltsActiveTheme)
            });
        }

        // Remove core and theme data types
        this.dataToImport = _.filter(this.dataToImport, (data) => {
            return ['core', 'theme'].indexOf(data.type) === -1;
        });

        _.each(this.dataToImport, (obj) => {
            obj.key = this.legacySettingsKeyValues[obj.key] || obj.key;

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
