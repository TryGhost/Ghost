const _ = require('lodash');

const validator = require('validator');
const moment = require('moment-timezone');
const assert = require('assert');

function assertString(input) {
    assert(typeof input === 'string', 'Validator js validates strings only');
}

// extends has been removed in validator >= 5.0.0, need to monkey-patch it back in
// @TODO: We modify the global validator dependency here! https://github.com/chriso/validator.js/issues/525#issuecomment-213149570
validator.extend = function (name, fn) {
    validator[name] = function () {
        const args = Array.prototype.slice.call(arguments);
        assertString(args[0]);
        return fn.apply(validator, args);
    };
};

// Provide a few custom validators
validator.extend('empty', function empty(str) {
    return _.isEmpty(str);
});

validator.extend('notContains', function notContains(str, badString) {
    return !_.includes(str, badString);
});

validator.extend('isTimezone', function isTimezone(str) {
    return moment.tz.zone(str) ? true : false;
});

validator.extend('isEmptyOrURL', function isEmptyOrURL(str) {
    return (_.isEmpty(str) || validator.isURL(str, {require_protocol: false}));
});

validator.extend('isSlug', function isSlug(str) {
    return validator.matches(str, /^[a-z0-9\-_]+$/);
});

module.exports = validator;
