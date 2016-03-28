// # Foreach Helper
// Usage: `{{#foreach data}}{{/foreach}}`
//
// Block helper designed for looping through posts
var hbs             = require('express-hbs'),
    _               = require('lodash'),
    errors          = require('../errors'),
    i18n            = require('../i18n'),

    hbsUtils        = hbs.handlebars.Utils,
    foreach;

foreach = function (itemType, options) {
    if (!options) {
        errors.logWarn(i18n.t('warnings.helpers.foreach.iteratorNeeded'));
    }

    // Initial values set based on parameters sent through. If nothing sent, set to defaults
    var fn = options.fn,
        inverse = options.inverse,
        columns = options.hash.columns,
        length = _.size(itemType),
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

    if (hbsUtils.isFunction(itemType)) {
        itemType = itemType.call(this);
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

        output = output + fn(itemType[field], {
            data: data,
            blockParams: hbsUtils.blockParams([itemType[field], field], [contextPath + field, null])
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

    if (itemType && typeof itemType === 'object') {
        iterateCollection(itemType);
    }

    if (length === 0) {
        output = inverse(this);
    }

    return output;
};

module.exports = foreach;
