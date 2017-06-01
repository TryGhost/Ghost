'use strict';

const debug = require('ghost-ignition').debug('importer:settings'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    BaseImporter = require('./base'),
    models = require('../../../../models');

class SettingsImporter extends BaseImporter {
    constructor(options) {
        super(_.extend(options, {
            modelName: 'Settings',
            dataKeyToImport: 'settings',
            requiredData: []
        }));

        // Map legacy keys
        this.legacySettingsKeyValues = {
            activeApps: 'active_apps',
            installedApps: 'installed_apps',
            isPrivate: 'is_private',
            activeTheme: 'active_theme', // TODO check we want tthis as we are not installing it?
            forceI18n: 'force_i18n',
            activeTimezone: 'active_timezone',
            cover: 'cover_image'
        };
    }

    /**
     * - 'core' and 'theme' are blacklisted
     * - clean up legacy plugin setting references
     */
    beforeImport() {
        debug('beforeImport');

        let self = this;

        // Remove core and theme data types
        this.dataToImport = _.filter(this.dataToImport, function (data) {
            return ['core', 'theme'].indexOf(data.type) === -1;
        });

        // Remove deprecated postsPerPage setting and defaultLang
        this.dataToImport = _.filter(this.dataToImport, function (data) {
            return data.key !== 'postsPerPage' && data.key !== 'defaultLang';
        });

        _.each(this.dataToImport, function (obj) {
            obj.key = self.legacySettingsKeyValues[obj.key] || obj.key;
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
