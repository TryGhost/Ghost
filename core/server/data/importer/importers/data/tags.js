'use strict';

const debug = require('ghost-ignition').debug('importer:tags'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    BaseImporter = require('./base'),
    models = require('../../../../models');

class TagsImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'Tag',
            dataKeyToImport: 'tags'
        });

        // Map legacy keys
        this.legacyKeys = {
            image: 'feature_image'
        };
    }

    beforeImport() {
        debug('beforeImport');
        return super.beforeImport();
    }

    /**
     * Find tag before adding.
     * Background:
     *   - the tag model is smart enough to regenerate unique fields
     *   - so if you import a tag name "test" and the same tag name exists, it would add "test-2"
     *   - that's we add a protection here to first find the tag
     *
     * @TODO: Add a flag to the base implementation e.g. `fetchBeforeAdd`
     */
    doImport(options, importOptions) {
        debug('doImport', this.modelName, this.dataToImport.length);

        let ops = [];

        this.dataToImport = this.dataToImport.map(this.legacyMapper);

        _.each(this.dataToImport, (obj) => {
            ops.push(models[this.modelName].findOne({name: obj.name}, options)
                .then((tag) => {
                    if (tag) {
                        return Promise.resolve();
                    }

                    return models[this.modelName].add(obj, options)
                        .then((importedModel) => {
                            obj.model = {
                                id: importedModel.id
                            };

                            if (importOptions.returnImportedData) {
                                this.importedDataToReturn.push(importedModel.toJSON());
                            }

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

module.exports = TagsImporter;
