'use strict';

const debug = require('ghost-ignition').debug('importer:roles'),
    BaseImporter = require('./base');

class RolesImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'Role',
            dataKeyToImport: 'roles'
        });

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
