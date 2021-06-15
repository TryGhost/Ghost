const _ = require('lodash');

const baseValidator = require('validator');
const moment = require('moment-timezone');
const assert = require('assert');

const allowedValidators = [
    'isLength',
    'isEmpty',
    'isURL',
    'isEmail',
    'isIn',
    'isUUID',
    'isBoolean',
    'isInt',
    'isLowercase',
    'equals',
    'matches'
];

function assertString(input) {
    assert(typeof input === 'string', 'Validator validates strings only');
}

const validators = {};

allowedValidators.forEach((name) => {
    if (_.has(baseValidator, name)) {
        validators[name] = baseValidator[name];
    }
});

validators.isTimezone = function isTimezone(str) {
    assertString(str);
    return moment.tz.zone(str) ? true : false;
};

validators.isEmptyOrURL = function isEmptyOrURL(str) {
    assertString(str);
    return (validators.isEmpty(str) || validators.isURL(str, {require_protocol: false}));
};

validators.isSlug = function isSlug(str) {
    assertString(str);
    return validators.matches(str, /^[a-z0-9\-_]+$/);
};

module.exports = validators;
