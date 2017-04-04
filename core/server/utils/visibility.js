var _ = require('lodash');
/**
 *
 * @param {Array|Object} items
 * @param {Array} visibility
 * @param {Boolean} [explicit]
 * @param {Function} [fn]
 * @returns {Array|Object} filtered items
 */
module.exports.filter = function visibilityFilter(items, visibility, explicit, fn) {
    var memo = _.isArray(items) ? [] : {};

    if (_.includes(visibility, 'all')) {
        return fn ? _.map(items, fn) : items;
    }

    // We don't want to change the structure of what is returned
    return _.reduce(items, function (items, item, key) {
        if (!item.visibility && !explicit || _.includes(visibility, item.visibility)) {
            var newItem = fn ? fn(item) : item;
            if (_.isArray(items)) {
                memo.push(newItem);
            } else {
                memo[key] = newItem;
            }
        }
        return memo;
    }, memo);
};

module.exports.parser = function visibilityParser(options) {
    if (!options.hash.visibility) {
        return ['public'];
    }

    return _.map(options.hash.visibility.split(','), _.trim);
};
