const debug = require('@tryghost/debug')('importer:tags');
const Promise = require('bluebird');
const _ = require('lodash');
const BaseImporter = require('./base');
const models = require('../../../../models');

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
    async doImport(options, importOptions) {
        debug('doImport', this.modelName, this.dataToImport.length);

        const importErrors = [];
        let obj = this.dataToImport.shift();
        while (obj) {
            try {
                const tag = await models[this.modelName].findOne({name: obj.name}, options);
                if (tag) {
                    obj = this.dataToImport.shift();
                    continue;
                }

                const importedModel = await models[this.modelName].add(obj, options);

                obj.model = {
                    id: importedModel.id
                };

                if (importOptions.returnImportedData) {
                    this.importedDataToReturn.push(importedModel.toJSON());
                }

                // for identifier lookup
                this.importedData.push({
                    id: importedModel.id,
                    originalId: this.originalIdMap[importedModel.id],
                    slug: importedModel.get('slug'),
                    originalSlug: obj.slug
                });
            } catch (error) {
                if (error) {
                    importErrors.push(...this.handleError(error, obj));
                }
            }

            // Shift next entry
            obj = this.dataToImport.shift();
        }

        // Ensure array is GCd
        this.dataToImport = null;
        if (importErrors.length > 0) {
            throw importErrors;
        }
    }
}

module.exports = TagsImporter;
