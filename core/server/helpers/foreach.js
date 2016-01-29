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

foreach = function (context, options) {
    if (!options) {
        errors.logWarn(i18n.t('warnings.helpers.foreach.iteratorNeeded'));
    }

    var fn = options.fn,
        inverse = options.inverse,
        columns = options.hash.columns,
        length = _.size(context),
        limit = parseInt(options.hash.limit, 10) || length,
        from = parseInt(options.hash.from, 10) || 1,
        to = parseInt(options.hash.to, 10) || (from - 1) + limit,
        output = '',
        data,
        contextPath;

    if (options.data && options.ids) {
        contextPath = hbsUtils.appendContextPath(options.data.contextPath, options.ids[0]) + '.';
    }

    if (hbsUtils.isFunction(context)) {
        context = context.call(this);
    }

    if (options.data) {
        data = hbs.handlebars.createFrame(options.data);
    }

    function execIteration(field, index, last) {
        if (data) {
            data.key = field;
            data.index = index;
            data.number = index + 1;
            data.first = index === from - 1; // From uses 1-indexed, but array uses 0-indexed.
            data.last = !!last;
            data.even = index % 2 === 1;
            data.odd = !data.even;
            data.rowStart = index % columns === 0;
            data.rowEnd = index % columns === (columns - 1);

            if (contextPath) {
                data.contextPath = contextPath + field;
            }
        }

        output = output + fn(context[field], {
            data: data,
            blockParams: hbsUtils.blockParams([context[field], field], [contextPath + field, null])
        });
    }

    function iterateCollection(context) {
        var count = 1,
            current = 1;

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

    if (context && typeof context === 'object') {
        iterateCollection(context);
    }

    if (length === 0) {
        output = inverse(this);
    }

    return output;
};

module.exports = foreach;
