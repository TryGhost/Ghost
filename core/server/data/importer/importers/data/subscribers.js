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

    doImport(options, importOptions) {
        return super.doImport(options, importOptions);
    }
}

module.exports = SubscribersImporter;
