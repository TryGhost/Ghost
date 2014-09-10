var Promise         = require('bluebird'),
    _               = require('lodash'),
    validation      = require('../validation'),
    errors          = require('../../errors'),
    uuid            = require('node-uuid'),
    validator       = require('validator'),
    tables          = require('../schema').tables,
    validate,
    handleErrors,
    sanitize,
    cleanError;

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
        message = 'Duplicate entry found. Multiple values of "' + value + '" found for ' + offendingProperty + '.';
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

sanitize = function sanitize(data) {
    // Check for correct UUID and fix if neccessary
    _.each(_.keys(data.data), function (tableName) {
        _.each(data.data[tableName], function (importValues) {
            var uuidMissing = (!importValues.uuid && tables[tableName].uuid) ? true : false,
                uuidMalformed = (importValues.uuid && !validator.isUUID(importValues.uuid)) ? true : false;

            if (uuidMissing || uuidMalformed) {
                importValues.uuid = uuid.v4();
            }
        });
    });

    return data;
};

validate = function validate(data) {
    var validateOps = [];

    _.each(_.keys(data.data), function (tableName) {
        _.each(data.data[tableName], function (importValues) {
            validateOps.push(validation.validateSchema(tableName, importValues));
        });
    });

    return Promise.settle(validateOps).then(function (descriptors) {
        var errorList = [];

        _.each(descriptors, function (d) {
            if (d.isRejected()) {
                errorList = errorList.concat(d.reason());
            }
        });

        if (!_.isEmpty(errorList)) {
            return Promise.reject(errorList);
        }
    });
};

module.exports = function (version, data) {
    var importer;

    data = sanitize(data);

    return validate(data).then(function () {
        try {
            importer = require('./' + version);
        } catch (ignore) {
            // Zero effs given
        }

        if (!importer) {
            return Promise.reject('No importer found');
        }

        return importer.importData(data);
    }).catch(function (result) {
        return handleErrors(result);
    });
};
