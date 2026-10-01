const debug = require('@tryghost/debug')('importer:form_submissions');
const _ = require('lodash');
const ObjectId = require('bson-objectid').default;
const BaseImporter = require('./base');
const models = require('../../../../models');
const {sequence} = require('@tryghost/promise');

class FormSubmissionsImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'FormSubmission',
            dataKeyToImport: 'form_submissions',
            requiredImportedData: ['forms'],
            requiredExistingData: ['forms']
        });
    }

    fetchExisting(modelOptions) {
        return models.Form.findAll(_.merge({columns: ['id']}, modelOptions))
            .then((existingForms) => {
                this.existingForms = existingForms.toJSON();
            });
    }

    sanitizeAttributes() {
        _.each(this.dataToImport, (sub) => {
            if (!sub.data) {
                sub.data = '{}';
            } else if (typeof sub.data === 'object') {
                try {
                    sub.data = JSON.stringify(sub.data);
                } catch {
                    sub.data = '{}';
                }
            }
        });
    }

    beforeImport() {
        debug('beforeImport');
        this.sanitizeValues();
        this.sanitizeAttributes();

        _.each(this.dataToImport, (obj) => {
            const newId = ObjectId().toHexString();
            if (obj.id) {
                this.originalIdMap[newId] = obj.id;
            }
            obj.id = newId;
        });

        return Promise.resolve();
    }

    async doImport(options, importOptions) {
        debug('doImport', this.modelName, this.dataToImport.length);

        const ops = [];

        _.each(this.dataToImport, (obj) => {
            ops.push(async () => {
                // Map form_id if the parent form had its ID remapped
                let targetFormId = obj.form_id;
                const importedForm = _.find(this.requiredImportedData.forms, {originalId: targetFormId});
                if (importedForm) {
                    targetFormId = importedForm.id;
                }

                // Verify the form exists either in imported forms or existing forms in db
                const formExists = importedForm || _.some(this.existingForms, {id: targetFormId});
                if (!formExists) {
                    this.problems.push({
                        message: 'Submission ignored: parent form could not be found.',
                        help: this.modelName,
                        context: JSON.stringify(obj)
                    });
                    return;
                }

                try {
                    const importedModel = await models.FormSubmission.add({
                        id: obj.id,
                        form_id: targetFormId,
                        data: obj.data,
                        created_at: obj.created_at || new Date()
                    }, options);

                    obj.model = {
                        id: importedModel.id
                    };

                    if (importOptions.returnImportedData) {
                        this.importedDataToReturn.push(importedModel.toJSON());
                    }

                    this.importedData.push({
                        id: importedModel.id,
                        originalId: this.originalIdMap[importedModel.id] || importedModel.id
                    });
                } catch (err) {
                    this.handleError(err, obj);
                }
            });
        });

        await sequence(ops);
    }
}

module.exports = FormSubmissionsImporter;
