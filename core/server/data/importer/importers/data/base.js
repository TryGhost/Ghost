'use strict';

const debug = require('ghost-ignition').debug('importer:base'),
    common = require('../../../../lib/common'),
    models = require('../../../../models'),
    _ = require('lodash'),
    Promise = require('bluebird');

class Base {
    constructor(options) {
        let self = this;

        this.modelName = options.modelName;

        this.problems = [];

        this.errorConfig = {
            allowDuplicates: true,
            returnDuplicates: true,
            showNotFoundWarning: true
        };

        this.legacyKeys = {};
        this.legacyMapper = function legacyMapper(item) {
            return _.mapKeys(item, function matchLegacyKey(value, key) {
                return self.legacyKeys[key] || key;
            });
        };

        this.dataKeyToImport = options.dataKeyToImport;
        this.dataToImport = _.cloneDeep(options[this.dataKeyToImport] || []);
        this.importedData = [];

        // NOTE: e.g. properties are removed or properties are added/changed before importing
        _.each(options, function (obj, key) {
            if (options.requiredData.indexOf(key) !== -1) {
                self[key] = _.cloneDeep(obj);
            }
        });

        if (!this.users) {
            this.users = _.cloneDeep(options.users);
        }
    }

    /**
     * Never ever import these attributes!
     */
    stripProperties(properties) {
        _.each(this.dataToImport, function (obj) {
            _.each(properties, function (property) {
                delete obj[property];
            });
        });
    }

    /**
     * Clean invalid values.
     */
    sanitizeValues() {
        let temporaryDate, self = this;

        _.each(this.dataToImport, function (obj) {
            _.each(_.pick(obj, ['updated_at', 'created_at', 'published_at']), function (value, key) {
                temporaryDate = new Date(value);

                if (isNaN(temporaryDate)) {
                    self.problems.push({
                        message: 'Date is in a wrong format and invalid. It was replaced with the current timestamp.',
                        help: self.modelName,
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
        let self = this, errorsToReject = [], problems = [];

        // CASE: validation errors, see models/base/events.js onValidate
        if (!_.isArray(errs)) {
            errs = [errs];
        }

        _.each(errs, function (err) {
            if (err.code && err.message.toLowerCase().indexOf('unique') !== -1) {
                if (self.errorConfig.allowDuplicates) {
                    if (self.errorConfig.returnDuplicates) {
                        problems.push({
                            message: 'Entry was not imported and ignored. Detected duplicated entry.',
                            help: self.modelName,
                            context: JSON.stringify(obj),
                            err: err
                        });
                    }
                } else {
                    errorsToReject.push(new common.errors.DataImportError({
                        message: 'Detected duplicated entry.',
                        help: self.modelName,
                        context: JSON.stringify(obj),
                        err: err
                    }));
                }
            } else if (err instanceof common.errors.NotFoundError) {
                if (self.showNotFoundWarning) {
                    problems.push({
                        message: 'Entry was not imported and ignored. Could not find entry.',
                        help: self.modelName,
                        context: JSON.stringify(obj),
                        err: err
                    });
                }
            } else {
                if (!common.errors.utils.isIgnitionError(err)) {
                    err = new common.errors.DataImportError({
                        message: err.message,
                        context: JSON.stringify(obj),
                        help: self.modelName,
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

    doImport(options) {
        debug('doImport', this.modelName, this.dataToImport.length);

        let self = this, ops = [];

        _.each(this.dataToImport, function (obj) {
            ops.push(models[self.modelName].add(obj, options)
                .then(function (importedModel) {
                    obj.model = importedModel.toJSON();
                    self.importedData.push(obj.model);
                    return importedModel;
                })
                .catch(function (err) {
                    return self.handleError(err, obj);
                })
                .reflect()
            );
        });

        return Promise.all(ops);
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
        let self = this, dataToEdit = {}, oldUser, context;

        debug('afterImport', this.modelName);

        return models.User.getOwnerUser(options)
            .then(function (ownerUser) {
                return Promise.each(self.dataToImport, function (obj) {
                    if (!obj.model) {
                        return;
                    }

                    return Promise.each(['author_id', 'published_by', 'created_by', 'updated_by'], function (key) {
                        // CASE: not all fields exist on each model, skip them if so
                        if (!obj[key]) {
                            return Promise.resolve();
                        }

                        oldUser = _.find(self.users, {id: obj[key]});

                        if (!oldUser) {
                            self.problems.push({
                                message: 'Entry was imported, but we were not able to update user reference field: ' + key,
                                help: self.modelName,
                                context: JSON.stringify(obj)
                            });

                            return;
                        }

                        return models.User.findOne({
                            email: oldUser.email,
                            status: 'all'
                        }, options).then(function (userModel) {
                            // CASE: user could not be imported e.g. multiple roles attached
                            if (!userModel) {
                                userModel = {
                                    id: ownerUser.id
                                };
                            }

                            dataToEdit = {};
                            dataToEdit[key] = userModel.id;

                            // CASE: updated_by is taken from the context object
                            if (key === 'updated_by') {
                                context = {context: {user: userModel.id}};
                            } else {
                                context = {};
                            }

                            return models[self.modelName].edit(dataToEdit, _.merge({}, options, {id: obj.model.id}, context));
                        });
                    });
                });
            });
    }
}

module.exports = Base;
