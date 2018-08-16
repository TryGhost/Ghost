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
    }

    fetchExisting(modelOptions) {
        return models.Tag.findAll(_.merge({columns: ['id', 'slug']}, modelOptions))
            .then((existingData) => {
                this.existingData = existingData.toJSON();
            });
    }

    beforeImport() {
        debug('beforeImport');
        return super.beforeImport();
    }

    /**
     * Find tag before adding.
     * Background:
     *   - the tag model is smart enough to regenerate unique fields
     *   - so if you import a tag slug "test" and the same tag slug exists, it would add "test-2"
     *   - that's why we add a protection here to first find the tag
     *
     * @TODO: Add a flag to the base implementation e.g. `fetchBeforeAdd`
     */
    doImport(options, importOptions) {
        debug('doImport', this.modelName, this.dataToImport.length);

        let ops = [];

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

module.exports = TagsImporter;
