const debug = require('@tryghost/debug')('importer:tags');
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

    async fetchExisting(modelOptions) {
        const existingData = await models.Tag.findAll(_.merge({columns: ['id', 'slug']}, modelOptions));
        this.existingData = existingData.toJSON();
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
     *   - tags without an explicit slug will always get a unique slug, so can always be imported without warning
     *
     * @TODO: Add a flag to the base implementation e.g. `fetchBeforeAdd`
     */
    async doImport(options, importOptions) {
        debug('doImport', this.modelName, this.dataToImport.length);

        const importErrors = [];
        let obj = this.dataToImport.shift();
        while (obj) {
            try {
                if (obj.slug) {
                    const tag = await models[this.modelName].findOne({slug: obj.slug}, options);
                    if (tag) {
                        this.problems.push({
                            message: 'Entry was not imported and ignored. Detected duplicated entry.',
                            help: this.modelName,
                            context: JSON.stringify(obj)
                        });
                        obj = this.dataToImport.shift();
                        continue;
                    }
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
