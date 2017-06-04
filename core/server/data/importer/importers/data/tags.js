'use strict';

const debug = require('ghost-ignition').debug('importer:tags'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    BaseImporter = require('./base'),
    models = require('../../../../models');

class TagsImporter extends BaseImporter {
    constructor(options) {
        super(_.extend(options, {
            modelName: 'Tag',
            dataKeyToImport: 'tags',
            requiredData: []
        }));

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
     */
    doImport(options) {
        debug('doImport', this.modelName, this.dataToImport.length);

        let self = this, ops = [];

        this.dataToImport = this.dataToImport.map(self.legacyMapper);

        _.each(this.dataToImport, function (obj) {
            ops.push(models[self.modelName].findOne({name: obj.name}, options).then(function (tag) {
                if (tag) {
                    return Promise.resolve();
                }

                return models[self.modelName].add(obj, options)
                    .then(function (newModel) {
                        obj.model = newModel.toJSON();
                        self.importedData.push(obj.model);
                        return newModel;
                    })
                    .catch(function (err) {
                        return self.handleError(err, obj);
                    });
            }).reflect());
        });

        return Promise.all(ops);
    }
}

module.exports = TagsImporter;
