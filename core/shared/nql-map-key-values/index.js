const _ = require('lodash');
const nql = require('@nexes/nql');

/*
 * Returns the replacement value for input, or input if it doesn't exist
 */
function replaceValue(input, valueMappings) {
    const replacer = valueMappings.find(({from}) => from === input);
    return replacer && replacer.to || input;
}

function fmap(item, fn) {
    return Array.isArray(item) ? item.map(fn) : fn(item);
}

function mapKeysAndValues(input, mapping) {
    return nql.utils.mapQuery(input, function (value, key) {
        // Ignore everything that has nothing to do with our mapping
        if (key !== mapping.key.from) {
            return {
                [key]: value
            };
        }

        // key: valueA
        if (typeof value !== 'object') {
            return {
                [mapping.key.to]: replaceValue(value, mapping.values)
            };
        }

        // key: { "$in": ['valueA', 'valueB'] }
        // key: { "$ne": 'valueA' }
        return {
            [mapping.key.to]: _.reduce(value, (memo, objValue, objKey) => {
                return Object.assign(memo, {
                    [objKey]: fmap(objValue, item => replaceValue(item, mapping.values))
                });
            }, {})
        };
    });
}

module.exports = mapping => input => mapKeysAndValues(input, mapping);
