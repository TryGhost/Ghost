// # Foreach Helper
// Usage: `{{#foreach data}}{{/foreach}}`
//
// Block helper designed for looping through posts
var hbs             = require('express-hbs'),
    errors          = require('../errors'),

    hbsUtils        = hbs.handlebars.Utils,
    foreach;

foreach = function (context, options) {
    if (!options) {
        errors.logWarn('Need to pass an iterator to #foreach');
    }

    var fn = options.fn,
        inverse = options.inverse,
        i = 0,
        columns = options.hash.columns,
        ret = '',
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

        ret = ret + fn(context[field], {
            data: data,
            blockParams: hbsUtils.blockParams([context[field], field], [contextPath + field, null])
        });
    }

    function iterateArray(context) {
        var j;
        for (j = context.length; i < j; i += 1) {
            execIteration(i, i, i === context.length - 1);
        }
    }

    function iterateObject(context) {
        var priorKey,
            key;

        for (key in context) {
            if (context.hasOwnProperty(key)) {
                // We're running the iterations one step out of sync so we can detect
                // the last iteration without have to scan the object twice and create
                // an itermediate keys array.
                if (priorKey) {
                    execIteration(priorKey, i - 1);
                }
                priorKey = key;
                i += 1;
            }
        }
        if (priorKey) {
            execIteration(priorKey, i - 1, true);
        }
    }

    if (context && typeof context === 'object') {
        if (hbsUtils.isArray(context)) {
            iterateArray(context);
        } else {
            iterateObject(context);
        }
    }

    if (i === 0) {
        ret = inverse(this);
    }

    return ret;
};

module.exports = foreach;
