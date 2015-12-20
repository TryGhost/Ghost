// # Foreach Helper
// Usage: `{{#foreach data}}{{/foreach}}`
//
// Block helper designed for looping through posts
var hbs             = require('express-hbs'),
    _               = require('lodash'),
    errors          = require('../errors'),

    hbsUtils        = hbs.handlebars.Utils,
    foreach;

foreach = function (context, options) {
    if (!options) {
        errors.logWarn('Need to pass an iterator to #foreach');
    }

    var fn = options.fn,
        inverse = options.inverse,
        columns = options.hash.columns,
        length = _.size(context),
        limit = parseInt(options.hash.limit, 10) || length,
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
            data.first = index === 0;
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
        var count = 1;

        _.each(context, function (item, key) {
            if (count <= limit) {
                execIteration(key, count - 1, count === limit);
            }
            count += 1;
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
