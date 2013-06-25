var _ = require('underscore'),
    moment = require('moment'),
    when = require('when'),
    pagination = require('./paginate'),
    navHelper = require('./navigation'),
    hbs = require('express-hbs'),
    coreHelpers;

coreHelpers = function (ghost) {
    /**
     * [ description]
     * @todo ghost core helpers + a way for themes to register them
     * @param  {Object} context date object
     * @param  {*} block
     * @return {Object} A Moment time / date object
     */
    ghost.registerThemeHelper('dateFormat', function (context, block) {
        var f = block.hash.format || "MMM Do, YYYY";
        return moment(context).format(f);
    });

    /**
     * [ description]
     *
     * @param String key
     * @param String default translation
     * @param {Object} options
     * @return String A correctly internationalised string
     */
    ghost.registerThemeHelper('e', function (key, defaultString, options) {
        var output;

        if (ghost.config().defaultLang === 'en' && _.isEmpty(options.hash) && !ghost.config().forceI18n) {
            output = defaultString;
        } else {
            output = ghost.polyglot().t(key, options.hash);
        }

        return output;
    });

    ghost.registerThemeHelper('json', function (object, options) {
        return JSON.stringify(object);
    });

    ghost.registerThemeHelper('foreach', function (context, options) {
        var fn = options.fn,
            inverse = options.inverse,
            i = 0,
            j = 0,
            columns = options.hash.columns,
            key,
            ret = "",
            data;

        if (options.data) {
            data = hbs.handlebars.createFrame(options.data);
        }

        function setKeys(_data, _i, _j, _columns) {
            if (_i === 0) {
                _data.first = true;
            }
            if (_i === _j - 1) {
                _data.last = true;
            }
            // first post is index zero but still needs to be odd
            if (_i % 2 === 1) {
                _data.even = true;
            } else {
                _data.odd = true;
            }
            if (_i % _columns === 0) {
                _data.rowStart = true;
            } else if (_i % _columns === (_columns - 1)) {
                _data.rowEnd = true;
            }
            return _data;
        }
        if (context && typeof context === 'object') {
            if (context instanceof Array) {
                for (j = context.length; i < j; i += 1) {
                    if (data) {
                        data.index = i;
                        data.first = data.rowEnd = data.rowStart = data.last = data.even = data.odd = false;
                        data = setKeys(data, i, j, columns);
                    }
                    ret = ret + fn(context[i], { data: data });
                }
            } else {
                for (key in context) {
                    if (context.hasOwnProperty(key)) {
                        j += 1;
                    }
                }
                for (key in context) {
                    if (context.hasOwnProperty(key)) {
                        if (data) {
                            data.key = key;
                            data.first = data.rowEnd = data.rowStart = data.last = data.even = data.odd = false;
                            data = setKeys(data, i, j, columns);
                        }
                        ret = ret + fn(context[key], {data: data});
                        i += 1;
                    }
                }
            }
        }

        if (i === 0) {
            ret = inverse(this);
        }
        return ret;
    });
    // Just one async helper for now, but could be more in the future
    return when.join(
        navHelper.registerWithGhost(ghost),
        pagination.registerWithGhost(ghost)
    );
};

module.exports.loadCoreHelpers = coreHelpers;