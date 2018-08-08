const debug = require('ghost-ignition').debug('importer:clients'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    BaseImporter = require('./base'),
    models = require('../../../../models');

class TrustedDomainsImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'ClientTrustedDomain',
            dataKeyToImport: 'client_trusted_domains',
            requiredExistingData: ['clients'],
            requiredFromFile: ['clients'],
            requiredImportedData: ['clients']
        });

        this.errorConfig = {
            allowDuplicates: false,
            returnDuplicates: true,
            showNotFoundWarning: false
        };
    }

    fetchExisting(modelOptions) {
        return models.ClientTrustedDomain.findAll(_.merge({columns: ['id', 'trusted_domain']}, modelOptions))
            .then((existingData) => {
                this.existingData = existingData.toJSON();
            });
    }

    beforeImport() {
        debug('beforeImport');

        // CASE: compare with existing trusted domains
        this.dataToImport = _.filter(this.dataToImport, (domainToImport) => {
            if (_.find(this.existingData, {trusted_domain: domainToImport.trusted_domain})) {
                return false;
            }

            return true;
        });

        return super.beforeImport();
    }

    replaceIdentifiers(modelOptions, importOptions = {}) {
        debug('replaceIdentifiers');

        if (!importOptions.include || importOptions.include.indexOf(this.dataKeyToImport) === -1) {
            return super.replaceIdentifiers(modelOptions, importOptions);
        }

        const randomClientId = this.requiredExistingData.clients[0].id;

        _.each(this.dataToImport, (domainToImport, index) => {
            let existingClient = _.find(this.requiredFromFile.clients, {id: domainToImport.client_id.toString()});

            // CASE: client is in file, look if it was imported or updated
            if (existingClient) {
                existingClient = _.find(this.requiredImportedData.clients, {slug: existingClient.slug});

                if (existingClient) {
                    this.dataToImport[index].client_id = existingClient.id;
                }
            } else {
                existingClient = _.find(this.requiredExistingData.clients, {id: domainToImport.client_id.toString()});

                if (!existingClient) {
                    this.dataToImport[index].client_id = randomClientId;
                }
            }
        });

        return super.replaceIdentifiers(modelOptions, importOptions);
    }

    generateIdentifier() {
        return Promise.resolve();
    }

    doImport(options, importOptions = {}) {
        debug('doImport', this.dataToImport.length);

        if (!importOptions.include || importOptions.include.indexOf(this.dataKeyToImport) === -1) {
            return Promise.resolve().reflect();
        }

        return super.doImport(options, importOptions);
    }
}

module.exports = TrustedDomainsImporter;
