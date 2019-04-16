const _ = require('lodash');

module.exports.findKey = function findKey(key /* ...objects... */) {
    let objects = Array.prototype.slice.call(arguments, 1);

    return _.reduceRight(objects, function (result, object) {
        if (object && _.has(object, key) && !_.isEmpty(object[key])) {
            result = object[key];
        }

        return result;
    }, null);
};
