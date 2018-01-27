'use strict';

const debug = require('ghost-ignition').debug('importer:subscribers'),
    BaseImporter = require('./base');

class SubscribersImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'Subscriber',
            dataKeyToImport: 'subscribers'
        });
    }

    beforeImport() {
        debug('beforeImport');
        return super.beforeImport();
    }

    doImport(options) {
        return super.doImport(options);
    }
}

module.exports = SubscribersImporter;
