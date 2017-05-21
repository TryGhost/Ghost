'use strict';

const debug = require('ghost-ignition').debug('importer:subscribers'),
    _ = require('lodash'),
    BaseImporter = require('./base');

class SubscribersImporter extends BaseImporter {
    constructor(options) {
        super(_.extend(options, {
            modelName: 'Subscriber',
            dataKeyToImport: 'subscribers',
            requiredData: []
        }));
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
