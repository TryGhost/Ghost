const debug = require('ghost-ignition').debug('importer:clients'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    BaseImporter = require('./base'),
    models = require('../../../../models');

class ClientsImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'Client',
            dataKeyToImport: 'clients'
        });

        this.errorConfig = {
            allowDuplicates: false,
            returnDuplicates: true,
            showNotFoundWarning: false
        };
    }

    fetchExisting(modelOptions) {
        return models.Client.findAll(_.merge({columns: ['id', 'slug']}, modelOptions))
            .then((existingData) => {
                this.existingData = existingData.toJSON();
            });
    }

    beforeImport() {
        debug('beforeImport');
        return super.beforeImport();
    }

    doImport(options, importOptions = {}) {
        debug('doImport', this.dataToImport.length);

        let ops = [];

        if (!importOptions.include || importOptions.include.indexOf(this.dataKeyToImport) === -1) {
            return Promise.resolve().reflect();
        }

        _.each(this.dataToImport, (obj) => {
            ops.push(models[this.modelName].findOne({slug: obj.slug}, options)
                .then((client) => {
                    if (client) {
                        return models[this.modelName]
                            .edit(_.omit(obj, 'id'), Object.assign({id: client.id}, options))
                            .then((importedModel) => {
                                obj.model = {
                                    id: importedModel.id
                                };

                                if (importOptions.returnImportedData) {
                                    this.importedDataToReturn.push(importedModel.toJSON());
                                }

                                // for identifier lookup
                                this.importedData.push({
                                    id: importedModel.id,
                                    slug: importedModel.get('slug'),
                                    originalSlug: obj.slug
                                });

                                return importedModel;
                            })
                            .catch((err) => {
                                return this.handleError(err, obj);
                            });
                    }

                    // @NOTE: name is also unique
                    return models[this.modelName].findOne({name: obj.name}, options);
                })
                .then((client) => {
                    if (client) {
                        obj.name = `${obj.name}-1`;
                    }

                    return models[this.modelName].add(obj, options)
                        .then((importedModel) => {
                            obj.model = {
                                id: importedModel.id
                            };

                            if (importOptions.returnImportedData) {
                                this.importedDataToReturn.push(importedModel.toJSON());
                            }

                            // for identifier lookup
                            this.importedData.push({
                                id: importedModel.id,
                                slug: importedModel.get('slug'),
                                originalSlug: obj.slug
                            });

                            return importedModel;
                        })
                        .catch((err) => {
                            return this.handleError(err, obj);
                        });
                }).reflect());
        });

        return Promise.all(ops);
    }
}

module.exports = ClientsImporter;
