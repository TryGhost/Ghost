const debug = require('@tryghost/debug')('importer:revue-subscriber');
const BaseImporter = require('./base');

class RevueSubscriberImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'Member',
            dataKeyToImport: 'revue_subscribers'
        });
    }

    beforeImport() {
        debug('beforeImport');
        return super.beforeImport();
    }

    async doImport(options, importOptions) {
        debug('doImport', this.modelName, this.dataToImport.length);

        return super.doImport(options, importOptions);
    }
}

module.exports = RevueSubscriberImporter;
