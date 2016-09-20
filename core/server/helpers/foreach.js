// # Foreach Helper
// Usage: `{{#foreach data}}{{/foreach}}`
//
// Block helper designed for looping through posts
var hbs             = require('express-hbs'),
    _               = require('lodash'),
    errors          = require('../errors'),
    i18n            = require('../i18n'),
    labs            = require('../utils/labs'),
    utils           = require('./utils'),

    hbsUtils        = hbs.handlebars.Utils,
    foreach;

function filterItemsByVisibility(items, options) {
    var visibility = utils.parseVisibility(options);

    if (!labs.isSet('internalTags') || _.includes(visibility, 'all')) {
        return items;
    }

    function visibilityFilter(item) {
        // If the item doesn't have a visibility property && options.hash.visibility wasn't set
        // We return the item, else we need to be sure that this item has the property
        if (!item.visibility && !options.hash.visibility || _.includes(visibility, item.visibility)) {
            return item;
        }
    }

    // We don't want to change the structure of what is returned
    return _.isArray(items) ? _.filter(items, visibilityFilter) : _.pickBy(items, visibilityFilter);
}

foreach = function (items, options) {
    if (!options) {
        errors.logWarn(i18n.t('warnings.helpers.foreach.iteratorNeeded'));
    }

    if (hbsUtils.isFunction(items)) {
        items = items.call(this);
    }

    // Exclude items which should not be visible in the theme
    items = filterItemsByVisibility(items, options);

    // Initial values set based on parameters sent through. If nothing sent, set to defaults
    var fn = options.fn,
        inverse = options.inverse,
        columns = options.hash.columns,
        length = _.size(items),
        limit = parseInt(options.hash.limit, 10) || length,
        from = parseInt(options.hash.from, 10) || 1,
        to = parseInt(options.hash.to, 10) || length,
        output = '',
        data,
        contextPath;

    // If a limit option was sent through (aka not equal to default (length))
    // and from plus limit is less than the length, set to to the from + limit
    if ((limit < length) && ((from + limit) <= length)) {
        to = (from - 1) + limit;
    }

    if (options.data && options.ids) {
        contextPath = hbsUtils.appendContextPath(options.data.contextPath, options.ids[0]) + '.';
    }

    if (options.data) {
        data = hbs.handlebars.createFrame(options.data);
    }

    function execIteration(field, index, last) {
        if (data) {
            data.key = field;
            data.index = index;
            data.number = index + 1;
            data.first = index === from - 1; // From uses 1-indexed, but array uses 0-indexed
            data.last = !!last;
            data.even = index % 2 === 1;
            data.odd = !data.even;
            data.rowStart = index % columns === 0;
            data.rowEnd = index % columns === (columns - 1);
            if (contextPath) {
                data.contextPath = contextPath + field;
            }
        }

        output = output + fn(items[field], {
            data: data,
            blockParams: hbsUtils.blockParams([items[field], field], [contextPath + field, null])
        });
    }

    function iterateCollection(context) {
        // Context is all posts on the blog
        var count = 1,
            current = 1;

        // For each post, if it is a post number that fits within the from and to
        // send the key to execIteration to set to be added to the page
        _.each(context, function (item, key) {
            if (current < from) {
                current += 1;
                return;
            }

            if (current <= to) {
                execIteration(key, current - 1, current === to);
            }
            count += 1;
            current += 1;
        });
    }

    if (items && typeof items === 'object') {
        iterateCollection(items);
    }

    if (length === 0) {
        output = inverse(this);
    }

    return output;
};

module.exports = foreach;
