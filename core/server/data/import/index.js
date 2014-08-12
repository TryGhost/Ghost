var when            = require('when'),
    _               = require('lodash'),
    validation      = require('../validation'),
    errors          = require('../../errors'),
    validate,
    handleErrors,
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
        return when.reject(errorList);
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

    return when.reject(processedErrors);
};

validate = function validate(data) {
    var validateOps = [];

    _.each(_.keys(data.data), function (tableName) {
        _.each(data.data[tableName], function (importValues) {
            validateOps.push(validation.validateSchema(tableName, importValues));
        });
    });

    return when.settle(validateOps).then(function (descriptors) {
        var errorList = [];

        _.each(descriptors, function (d) {
            if (d.state === 'rejected') {
                errorList = errorList.concat(d.reason);
            }
        });

        if (!_.isEmpty(errorList)) {
            return when.reject(errorList);
        }

        return when.resolve();
    });
};

module.exports = function (version, data) {
    var importer;

    return validate(data).then(function () {
        try {
            importer = require('./' + version);
        } catch (ignore) {
            // Zero effs given
        }

        if (!importer) {
            return when.reject('No importer found');
        }

        return importer.importData(data);
    }).catch(function (result) {
        return handleErrors(result);
    });
};
