const debug = require('@tryghost/debug')('importer:forms');
const _ = require('lodash');
const ObjectId = require('bson-objectid').default;
const BaseImporter = require('./base');
const models = require('../../../../models');
const {sequence} = require('@tryghost/promise');

class FormsImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'Form',
            dataKeyToImport: 'forms'
        });
    }

    fetchExisting(modelOptions) {
        return models.Form.findAll(_.merge({columns: ['id', 'name']}, modelOptions))
            .then((existingData) => {
                this.existingData = existingData.toJSON();
            });
    }

    sanitizeAttributes() {
        _.each(this.dataToImport, (obj) => {
            if (!obj.name || typeof obj.name !== 'string') {
                obj.name = 'Untitled Form';
            }

            if (!['active', 'archived'].includes(obj.status)) {
                obj.status = 'active';
            }

            if (!obj.schema) {
                obj.schema = JSON.stringify({fields: []});
            } else if (typeof obj.schema === 'object') {
                try {
                    obj.schema = JSON.stringify(obj.schema);
                } catch {
                    obj.schema = JSON.stringify({fields: []});
                }
            }
        });
    }

    beforeImport() {
        debug('beforeImport');
        this.sanitizeValues();
        this.sanitizeAttributes();

        // Preserve form IDs whenever possible to maintain post embed card links
        const existingMap = new Map((this.existingData || []).map(f => [f.id, f]));

        _.each(this.dataToImport, (obj) => {
            const originalId = obj.id;

            if (originalId && !existingMap.has(originalId)) {
                // ID does not clash with existing forms: preserve it
                this.originalIdMap[originalId] = originalId;
            } else if (originalId && existingMap.has(originalId)) {
                const existing = existingMap.get(originalId);
                if (existing.name === obj.name) {
                    // Exact duplicate form in the same database: mark duplicate and skip insertion
                    obj.isDuplicate = true;
                    this.originalIdMap[originalId] = originalId;
                } else {
                    // Clash with a different form: generate new unique ID and record mapping
                    const newId = ObjectId().toHexString();
                    this.originalIdMap[newId] = originalId;
                    obj.id = newId;
                }
            } else {
                // No ID was provided in file: generate a new one
                const newId = ObjectId().toHexString();
                this.originalIdMap[newId] = originalId;
                obj.id = newId;
            }
        });

        return Promise.resolve();
    }

    async doImport(options, importOptions) {
        debug('doImport', this.modelName, this.dataToImport.length);

        const ops = [];

        _.each(this.dataToImport, (obj) => {
            ops.push(async () => {
                if (obj.isDuplicate) {
                    this.importedData.push({
                        id: obj.id,
                        originalId: obj.id,
                        name: obj.name
                    });
                    return;
                }

                try {
                    const importedModel = await models.Form.add({
                        id: obj.id,
                        name: obj.name,
                        description: obj.description || null,
                        status: obj.status || 'active',
                        schema: obj.schema
                    }, options);

                    obj.model = {
                        id: importedModel.id
                    };

                    if (importOptions.returnImportedData) {
                        this.importedDataToReturn.push(importedModel.toJSON());
                    }

                    this.importedData.push({
                        id: importedModel.id,
                        originalId: this.originalIdMap[importedModel.id] || importedModel.id,
                        name: importedModel.get('name')
                    });
                } catch (err) {
                    this.handleError(err, obj);
                }
            });
        });

        await sequence(ops);
    }
}

module.exports = FormsImporter;
