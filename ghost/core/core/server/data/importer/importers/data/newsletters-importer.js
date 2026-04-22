const debug = require('@tryghost/debug')('importer:newsletters');
const _ = require('lodash');
const BaseImporter = require('./base');
const models = require('../../../../models');

const ignoredColumns = ['sender_email'];

class NewslettersImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'Newsletter',
            dataKeyToImport: 'newsletters'
        });
    }

    /**
    * Remove ignored columns
    */
    sanitizeValues() {
        _.each(this.dataToImport, (obj) => {
            ignoredColumns.forEach((column) => {
                delete obj[column];
            });
        });
    }

    fetchExisting(modelOptions) {
        return models.Newsletter.findAll(_.merge({columns: ['id']}, modelOptions))
            .then((existingData) => {
                this.existingData = existingData.toJSON();
            });
    }

    beforeImport() {
        debug('beforeImport');
        this.sanitizeValues();
        return super.beforeImport();
    }

    doImport(options, importOptions) {
        return super.doImport(options, importOptions);
    }
}

module.exports = NewslettersImporter;
