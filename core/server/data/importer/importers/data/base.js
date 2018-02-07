'use strict';

const debug = require('ghost-ignition').debug('importer:base'),
    common = require('../../../../lib/common'),
    sequence = require('../../../../lib/promise/sequence'),
    models = require('../../../../models'),
    _ = require('lodash'),
    Promise = require('bluebird');

class Base {
    constructor(allDataFromFile, options) {
        this.options = options;
        this.modelName = options.modelName;

        this.problems = [];

        this.errorConfig = {
            allowDuplicates: true,
            returnDuplicates: true,
            showNotFoundWarning: true
        };

        this.legacyKeys = {};
        this.legacyMapper = (item) => {
            return _.mapKeys(item, (value, key) => {
                return this.legacyKeys[key] || key;
            });
        };

        this.dataKeyToImport = options.dataKeyToImport;
        this.dataToImport = _.cloneDeep(allDataFromFile[this.dataKeyToImport] || []);
        this.importedDataToReturn = [];

        this.requiredFromFile = {};

        if (!this.options.requiredFromFile) {
            this.options.requiredFromFile = ['users'];
        } else {
            this.options.requiredFromFile.push('users');
        }

        _.each(this.options.requiredFromFile, (key) => {
            this.requiredFromFile[key] = _.cloneDeep(allDataFromFile[key]);
        });
    }

    /**
     * Never ever import these attributes!
     */
    stripProperties(properties) {
        _.each(this.dataToImport, (obj) => {
            _.each(properties, (property) => {
                delete obj[property];
            });
        });
    }

    /**
     * Clean invalid values.
     */
    sanitizeValues() {
        _.each(this.dataToImport, (obj) => {
            _.each(_.pick(obj, ['updated_at', 'created_at', 'published_at']), (value, key) => {
                let temporaryDate = new Date(value);

                if (isNaN(temporaryDate)) {
                    this.problems.push({
                        message: 'Date is in a wrong format and invalid. It was replaced with the current timestamp.',
                        help: this.modelName,
                        context: JSON.stringify(obj)
                    });

                    obj[key] = new Date().toISOString();
                }
            });
        });
    }

    beforeImport() {
        this.stripProperties(['id']);
        this.sanitizeValues();
        return Promise.resolve();
    }

    handleError(errs, obj) {
        let errorsToReject = [], problems = [];

        // CASE: validation errors, see models/base/events.js onValidate
        if (!_.isArray(errs)) {
            errs = [errs];
        }

        _.each(errs, (err) => {
            if (err.code && err.message.toLowerCase().indexOf('unique') !== -1) {
                if (this.errorConfig.allowDuplicates) {
                    if (this.errorConfig.returnDuplicates) {
                        problems.push({
                            message: 'Entry was not imported and ignored. Detected duplicated entry.',
                            help: this.modelName,
                            context: JSON.stringify(obj),
                            err: err
                        });
                    }
                } else {
                    errorsToReject.push(new common.errors.DataImportError({
                        message: 'Detected duplicated entry.',
                        help: this.modelName,
                        context: JSON.stringify(obj),
                        err: err
                    }));
                }
            } else if (err instanceof common.errors.NotFoundError) {
                if (this.errorConfig.showNotFoundWarning) {
                    problems.push({
                        message: 'Entry was not imported and ignored. Could not find entry.',
                        help: this.modelName,
                        context: JSON.stringify(obj),
                        err: err
                    });
                }
            } else {
                if (!common.errors.utils.isIgnitionError(err)) {
                    err = new common.errors.DataImportError({
                        message: err.message,
                        context: JSON.stringify(obj),
                        help: this.modelName,
                        errorType: err.errorType,
                        err: err
                    });
                } else {
                    err.context = JSON.stringify(obj);
                }

                errorsToReject.push(err);
            }
        });

        if (!errorsToReject.length) {
            this.problems = this.problems.concat(problems);
            debug('detected problem/warning', problems);

            return Promise.resolve();
        }

        debug('err', errorsToReject, obj);
        return Promise.reject(errorsToReject);
    }

    doImport(options, importOptions) {
        debug('doImport', this.modelName, this.dataToImport.length);

        let ops = [];

        _.each(this.dataToImport, (obj) => {
            ops.push(() => {
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
                    })
                    .reflect();
            });
        });

        /**
         * NOTE: Do not run with Promise.all in this case. With a large import file, we run an enormous
         *       amount of queries in parallel. Node will very fast eat lot's of memory, because all queries start
         *       at the same time, but memory can only be released if the query finished.
         *
         *       Promise.map(.., {concurrency: Int}) was not really improving the end performance for me.
         */
        return sequence(ops);
    }

    /**
     * Update all user reference fields e.g. published_by
     *
     * Background:
     *  - we never import the id field
     *  - almost each imported model has a reference to a user reference
     *  - we update all fields after the import (!)
     */
    afterImport(options) {
        debug('afterImport', this.modelName);

        return models.User.getOwnerUser(options)
            .then((ownerUser) => {
                return Promise.each(this.dataToImport, (obj) => {
                    if (!obj.model) {
                        return;
                    }

                    return Promise.each(['author_id', 'published_by', 'created_by', 'updated_by'], (key) => {
                        // CASE: not all fields exist on each model, skip them if so
                        if (!obj[key]) {
                            return Promise.resolve();
                        }

                        let oldUser = _.find(this.requiredFromFile.users, {id: obj[key]});

                        if (!oldUser) {
                            this.problems.push({
                                message: 'Entry was imported, but we were not able to update user reference field: ' +
                                key + '. The user does not exist, fallback to owner user.',
                                help: this.modelName,
                                context: JSON.stringify(obj)
                            });

                            oldUser = {
                                email: ownerUser.get('email')
                            };
                        }

                        return models.User.findOne({
                            email: oldUser.email,
                            status: 'all'
                        }, options).then((userModel) => {
                            // CASE: user could not be imported e.g. multiple roles attached
                            if (!userModel) {
                                userModel = {
                                    id: ownerUser.id
                                };
                            }

                            let dataToEdit = {};
                            dataToEdit[key] = userModel.id;

                            let context;

                            // CASE: updated_by is taken from the context object
                            if (key === 'updated_by') {
                                context = {context: {user: userModel.id}};
                            } else {
                                context = {};
                            }

                            return models[this.modelName].edit(dataToEdit, _.merge({}, options, {id: obj.model.id}, context));
                        });
                    });
                });
            });
    }
}

module.exports = Base;
