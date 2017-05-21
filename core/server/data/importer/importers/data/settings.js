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

        this.legacyKeys = {
            activePlugins: 'active_apps',
            installedPlugins: 'installed_apps'
        };
    }

    /**
     * - 'core' and 'theme' are blacklisted
     * - clean up legacy plugin setting references
     */
    beforeImport() {
        debug('beforeImport');

        let self = this;

        this.dataToImport = _.filter(this.dataToImport, function (data) {
            return ['core', 'theme'].indexOf(data.type) === -1;
        });

        _.each(this.dataToImport, function (obj) {
            obj.key = self.legacyKeys[obj.key] || obj.key;
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
