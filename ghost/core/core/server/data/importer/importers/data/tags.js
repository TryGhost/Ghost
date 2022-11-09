const debug = require('@tryghost/debug')('importer:tags');
const _ = require('lodash');
const BaseImporter = require('./base');
const models = require('../../../../models');
const {sequence} = require('@tryghost/promise');

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

        let ops = [];

        _.each(this.dataToImport, (obj) => {
            ops.push(async () => {
                if (obj.slug) {
                    const tag = await models[this.modelName].findOne({slug: obj.slug}, options);
                    if (tag) {
                        return;
                    }
                }

                try {
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
                } catch (err) {
                    this.handleError(err, obj);
                }
            });
        });

        await sequence(ops);
    }
}

module.exports = TagsImporter;
