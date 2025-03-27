const debug = require('@tryghost/debug')('importer:base');
const _ = require('lodash');
const ObjectId = require('bson-objectid').default;
const errors = require('@tryghost/errors');
const {sequence} = require('@tryghost/promise');
const models = require('../../../../models');

class Base {
    constructor(allDataFromFile, options) {
        this.options = options;
        this.modelName = options.modelName;

        // Problems are currently constructed but not displayed to the user
        this.problems = [];
        this.errors = [];

        this.errorConfig = {
            allowDuplicates: true,
            returnDuplicates: true,
            showNotFoundWarning: true
        };

        this.dataKeyToImport = options.dataKeyToImport;
        this.dataToImport = _.cloneDeep(allDataFromFile[this.dataKeyToImport] || []);
        this.originalIdMap = {};

        this.importedDataToReturn = [];
        this.importedData = [];

        this.requiredFromFile = {};
        this.requiredImportedData = {};
        this.requiredExistingData = {};

        if (!this.options.requiredImportedData) {
            this.options.requiredImportedData = ['users'];
        } else {
            this.options.requiredImportedData.push('users');
        }

        if (!this.options.requiredExistingData) {
            this.options.requiredExistingData = ['users'];
        } else {
            this.options.requiredExistingData.push('users');
        }

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
     * Strips attributes of the object
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

    generateIdentifier() {
        _.each(this.dataToImport, (obj) => {
            const newId = ObjectId().toHexString();

            if (obj.id) {
                this.originalIdMap[newId] = obj.id;
            }

            obj.id = newId;
        });
    }

    fetchExisting() {
        return Promise.resolve();
    }

    beforeImport() {
        this.sanitizeValues();
        this.generateIdentifier();
        return Promise.resolve();
    }

    handleError(errs, obj) {
        let errorsToReject = [];
        let problems = [];

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
                    errorsToReject.push(new errors.DataImportError({
                        message: 'Detected duplicated entry.',
                        help: this.modelName,
                        context: JSON.stringify(obj),
                        err: err
                    }));
                }
            } else if (err instanceof errors.NotFoundError) {
                if (this.errorConfig.showNotFoundWarning) {
                    problems.push({
                        message: 'Entry was not imported and ignored. Could not find entry.',
                        help: this.modelName,
                        context: JSON.stringify(obj),
                        err: err
                    });
                }
            } else {
                if (!errors.utils.isGhostError(err)) {
                    err = new errors.DataImportError({
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

            return;
        }

        debug('err', errorsToReject, obj);
        this.errors = this.errors.concat(errorsToReject);
    }

    /**
     * Data is now prepared. Last step is to replace identifiers.
     *
     * `dataToImport`: the objects to import (contain the new ID already)
     * `requiredExistingData`: the importer allows you to ask for existing database objects
     * `requiredFromFile`: the importer allows you to ask for data from the file
     * `requiredImportedData`: the importer allows you to ask for already imported data
     */
    replaceIdentifiers() {
        const ownerUserId = _.find(this.requiredExistingData.users, (user) => {
            if (user.roles[0].name === 'Owner') {
                return true;
            }
        }).id;

        let userReferenceProblems = {};

        const handleObject = (obj, key) => {
            if (!Object.prototype.hasOwnProperty.call(obj, key)) {
                return;
            }

            // CASE: you import null, fallback to owner
            if (!obj[key]) {
                // Exception: If the imported post is a draft published_by will be null. Not a userReferenceProblem.
                if (key === 'published_by' && obj.status === 'draft') {
                    return;
                }

                if (!userReferenceProblems[obj.id]) {
                    userReferenceProblems[obj.id] = {obj: _.cloneDeep(obj), keys: []};
                }

                userReferenceProblems[obj.id].keys.push(key);
                obj[key] = ownerUserId;
                return;
            }

            // CASE: first match the user reference with in the imported file
            let userFromFile = _.find(this.requiredFromFile.users, {id: obj[key]});

            if (!userFromFile) {
                // CASE: if user does not exist in file, try to lookup the existing db users
                let existingUser = _.find(this.requiredExistingData.users, {id: obj[key].toString()});

                // CASE: fallback to owner
                if (!existingUser) {
                    if (!userReferenceProblems[obj.id]) {
                        userReferenceProblems[obj.id] = {obj: _.cloneDeep(obj), keys: []};
                    }

                    userReferenceProblems[obj.id].keys.push(key);

                    obj[key] = ownerUserId;
                    return;
                } else {
                    // CASE: user exists in the database, ID is correct, skip
                    return;
                }
            }

            // CASE: users table is the first data we insert. we have no access to the imported data yet
            // Result: `this.requiredImportedData.users` will be empty.
            // We already generate identifiers for each object in the importer layer. Accessible via `dataToImport`.
            if (this.modelName === 'User' && !this.requiredImportedData.users.length) {
                let userToImport = _.find(this.dataToImport, {slug: userFromFile.slug});

                if (userToImport) {
                    obj[key] = userToImport.id;
                    return;
                } else {
                    // CASE: unknown
                    return;
                }
            }

            // CASE: user exists in the file, let's find his db id
            // NOTE: lookup by email, because slug can change on insert
            let importedUser = _.find(this.requiredImportedData.users, {email: userFromFile.email});

            // CASE: found. let's assign the new ID
            if (importedUser) {
                obj[key] = importedUser.id;
                return;
            }

            // CASE: user was not imported, let's figure out if the user exists in the database
            let existingUser = _.find(this.requiredExistingData.users, {slug: userFromFile.slug});

            if (!existingUser) {
                // CASE: let's try by ID
                existingUser = _.find(this.requiredExistingData.users, {id: userFromFile.id.toString()});

                if (!existingUser) {
                    if (!userReferenceProblems[obj.id]) {
                        userReferenceProblems[obj.id] = {obj: _.cloneDeep(obj), keys: []};
                    }

                    userReferenceProblems[obj.id].keys.push(key);

                    obj[key] = ownerUserId;
                }
            } else {
                obj[key] = existingUser.id;
            }
        };

        /**
         * @deprecated: x_by fields (https://github.com/TryGhost/Ghost/issues/10286)
         */
        // Iterate over all possible user relations
        _.each(this.dataToImport, (obj) => {
            _.each([
                'author_id',
                'published_by',
                'created_by',
                'updated_by'
            ], (key) => {
                return handleObject(obj, key);
            });
        });

        _.each(userReferenceProblems, (entry) => {
            this.problems.push({
                message: 'Entry was imported, but we were not able to resolve the following user references: ' +
                entry.keys.join(', ') + '. The user does not exist, fallback to owner user.',
                help: this.modelName,
                context: JSON.stringify(entry.obj)
            });
        });
    }

    /**
     * @returns {Object}
     */
    mapImportedData(originalObject, importedObject) {
        return {
            id: importedObject.id,
            originalId: this.originalIdMap[importedObject.id],
            slug: importedObject.get('slug'),
            originalSlug: originalObject.slug,
            email: importedObject.get('email')
        };
    }

    async doImport(options, importOptions) {
        debug('doImport', this.modelName, this.dataToImport.length);

        let ops = [];

        _.each(this.dataToImport, (obj, index) => {
            ops.push(async () => {
                try {
                    const importedModel = await models[this.modelName].add(obj, options);
                    obj.model = {
                        id: importedModel.id
                    };

                    if (importOptions.returnImportedData) {
                        this.importedDataToReturn.push(importedModel.toJSON());
                    }

                    // for identifier lookup
                    this.importedData.push(
                        this.mapImportedData(obj, importedModel)
                    );

                    // To free memory early
                    this.dataToImport.splice(index, 1);
                } catch (err) {
                    this.handleError(err, obj);
                }
            });
        });

        await sequence(ops);
    }
}

module.exports = Base;
