var RRule = require('rrule').RRule,
    moment = require('moment');

exports.parseString = function (str) {
    return RRule.fromString(str);
};

exports.dateToString = function (date) {
    return moment(date).format('YYYYMMDDTHHmmss') + 'Z';
};
