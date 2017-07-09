'use strict';

const debug = require('ghost-ignition').debug('importer:settings'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    BaseImporter = require('./base'),
    models = require('../../../../models'),
    defaultSettings = require('../../../schema/default-settings.json'),
    labsDefaults = JSON.parse(defaultSettings.blog.labs.defaultValue);

class SettingsImporter extends BaseImporter {
    constructor(options) {
        super(_.extend(options, {
            modelName: 'Settings',
            dataKeyToImport: 'settings',
            requiredData: []
        }));

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

        let self = this,
            ltsActiveTheme = _.find(this.dataToImport, {key: 'activeTheme'});

        // If there is an lts we want to warn user that theme is not imported
        if (ltsActiveTheme) {
            self.problems.push({
                message: 'Theme not imported, please upload in Settings - Design',
                help: self.modelName,
                context: JSON.stringify(ltsActiveTheme)
            });
        }

        // Remove core and theme data types
        this.dataToImport = _.filter(this.dataToImport, function (data) {
            return ['core', 'theme'].indexOf(data.type) === -1;
        });

        _.each(this.dataToImport, function (obj) {
            obj.key = self.legacySettingsKeyValues[obj.key] || obj.key;

            if (obj.key === 'labs' && obj.value) {
                // Overwrite the labs setting with our current defaults
                // Ensures things that are enabled in new versions, are turned on
                obj.value = JSON.stringify(_.assign({}, JSON.parse(obj.value), labsDefaults));
            }
        });

        return super.beforeImport();
    }

    doImport(options) {
        debug('doImport', this.dataToImport.length);

        let self = this, ops = [];

        _.each(this.dataToImport, function (model) {
            ops.push(
                models.Settings.edit(model, options)
                    .catch(function (err) {
                        return self.handleError(err, model);
                    })
                    .reflect()
            );
        });

        return Promise.all(ops);
    }

    /**
     * We only update existing settings models.
     * Nothing todo here.
     */
    afterImport() {
        return Promise.resolve();
    }
}

module.exports = SettingsImporter;
