'use strict';

const debug = require('ghost-ignition').debug('importer:roles'),
    _ = require('lodash'),
    BaseImporter = require('./base');

class RolesImporter extends BaseImporter {
    constructor(options) {
        super(_.extend(options, {
            modelName: 'Role',
            dataKeyToImport: 'roles',
            requiredData: []
        }));

        this.errorConfig.returnDuplicates = false;
    }

    beforeImport() {
        debug('beforeImport');
        return super.beforeImport();
    }

    doImport(options) {
        return super.doImport(options);
    }
}

module.exports = RolesImporter;
