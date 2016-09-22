var Promise         = require('bluebird'),
    _               = require('lodash'),
    validation      = require('../validation'),
    errors          = require('../../errors'),
    uuid            = require('node-uuid'),
    importer        = require('./data-importer'),
    tables          = require('../schema').tables,
    i18n            = require('../../i18n'),
    validate,
    handleErrors,
    checkDuplicateAttributes,
    sanitize,
    cleanError,
    doImport;

cleanError = function cleanError(error) {
    var temp,
        message,
        offendingProperty,
        value;

    if (error.raw.message.toLowerCase().indexOf('unique') !== -1) {
        // This is a unique constraint failure
        if (error.raw.message.indexOf('ER_DUP_ENTRY') !== -1) {
            temp = error.raw.message.split('\'');
            if (temp.length === 5) {
                value = temp[1];
                temp = temp[3].split('_');
                offendingProperty = temp.length === 3 ? temp[0] + '.' + temp[1] : error.model;
            }
        } else if (error.raw.message.indexOf('SQLITE_CONSTRAINT') !== -1) {
            temp = error.raw.message.split('failed: ');
            offendingProperty = temp.length === 2 ? temp[1] : error.model;
            temp = offendingProperty.split('.');
            value = temp.length === 2 ? error.data[temp[1]] : 'unknown';
        } else if (error.raw.detail) {
            value = error.raw.detail;
            offendingProperty = error.model;
        }
        message = i18n.t('errors.data.import.index.duplicateEntryFound', {value: value, offendingProperty: offendingProperty});
    }

    offendingProperty = offendingProperty || error.model;
    value = value || 'unknown';
    message = message || error.raw.message;

    return new errors.DataImportError(message, offendingProperty, value);
};

handleErrors = function handleErrors(errorList) {
    var processedErrors = [];

    if (!_.isArray(errorList)) {
        return Promise.reject(errorList);
    }

    _.each(errorList, function (error) {
        if (!error.raw) {
            // These are validation errors
            processedErrors.push(error);
        } else if (_.isArray(error.raw)) {
            processedErrors = processedErrors.concat(error.raw);
        } else {
            processedErrors.push(cleanError(error));
        }
    });

    return Promise.reject(processedErrors);
};

checkDuplicateAttributes = function checkDuplicateAttributes(data, comparedValue, attribs) {
    // Check if any objects in data have the same attribute values
    return _.find(data, function (datum) {
        return _.every(attribs, function (attrib) {
            return datum[attrib] === comparedValue[attrib];
        });
    });
};

sanitize = function sanitize(data) {
    var allProblems = {},
        tablesInData = _.keys(data.data),
        tableNames = _.sortBy(_.keys(tables), function (tableName) {
            // We want to guarantee posts and tags go first
            if (tableName === 'posts') {
                return 1;
            } else if (tableName === 'tags') {
                return 2;
            }

            return 3;
        });

    tableNames = _.intersection(tableNames, tablesInData);

    _.each(tableNames, function (tableName) {
        // Sanitize the table data for duplicates and valid uuid and created_at values
        var sanitizedTableData = _.transform(data.data[tableName], function (memo, importValues) {
            var uuidMissing = (!importValues.uuid && tables[tableName].uuid) ? true : false,
                uuidMalformed = (importValues.uuid && !validation.validator.isUUID(importValues.uuid)) ? true : false,
                isDuplicate,
                problemTag;

            // Check for correct UUID and fix if necessary
            if (uuidMissing || uuidMalformed) {
                importValues.uuid = uuid.v4();
            }

            // Custom sanitize for posts, tags and users
            if (tableName === 'posts') {
                // Check if any previously added posts have the same
                // title and slug
                isDuplicate = checkDuplicateAttributes(memo.data, importValues, ['title', 'slug']);

                // If it's a duplicate add to the problems and continue on
                if (isDuplicate) {
                    // TODO: Put the reason why it was a problem?
                    memo.problems.push(importValues);
                    return;
                }
            } else if (tableName === 'tags') {
                // Check if any previously added posts have the same
                // name and slug
                isDuplicate = checkDuplicateAttributes(memo.data, importValues, ['name', 'slug']);

                // If it's a duplicate add to the problems and continue on
                if (isDuplicate) {
                    // TODO: Put the reason why it was a problem?
                    // Remember this tag so it can be updated later
                    importValues.duplicate = isDuplicate;
                    memo.problems.push(importValues);

                    return;
                }
            } else if (tableName === 'posts_tags') {
                // Fix up removed tags associations
                problemTag = _.find(allProblems.tags, function (tag) {
                    return tag.id === importValues.tag_id;
                });

                // Update the tag id to the original "duplicate" id
                if (problemTag) {
                    importValues.tag_id = problemTag.duplicate.id;
                }
            }

            memo.data.push(importValues);
        }, {
            data: [],
            problems: []
        });

        // Store the table data to return
        data.data[tableName] = sanitizedTableData.data;

        // Keep track of all problems for all tables
        if (!_.isEmpty(sanitizedTableData.problems)) {
            allProblems[tableName] = sanitizedTableData.problems;
        }
    });

    return {
        data: data,
        problems: allProblems
    };
};

validate = function validate(data) {
    var validateOps = [];

    _.each(_.keys(data.data), function (tableName) {
        _.each(data.data[tableName], function (importValues) {
            validateOps.push(validation.
                validateSchema(tableName, importValues).reflect());
        });
    });

    return Promise.all(validateOps).then(function (descriptors) {
        var errorList = [];

        _.each(descriptors, function (d) {
            if (!d.isFulfilled()) {
                errorList = errorList.concat(d.reason());
            }
        });

        if (!_.isEmpty(errorList)) {
            return Promise.reject(errorList);
        }
    });
};

doImport = function (data) {
    var sanitizeResults = sanitize(data);

    data = sanitizeResults.data;

    return validate(data).then(function () {
        return importer.importData(data);
    }).then(function () {
        return sanitizeResults;
    }).catch(function (result) {
        return handleErrors(result);
    });
};

module.exports.doImport = doImport;
