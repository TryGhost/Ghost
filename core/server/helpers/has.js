// # Has Helper
// Usage: `{{#has tag="video, music"}}`, `{{#has author="sam, pat"}}`
//
// Checks if a post has a particular property

var proxy = require('./proxy'),
    _ = require('lodash'),
    logging = proxy.logging,
    i18n = proxy.i18n,
    validAttrs = ['tag', 'author', 'slug', 'id', 'number', 'index', 'any', 'all'];

function evaluateTagList(expr, tags) {
    return expr.split(',').map(function (v) {
        return v.trim();
    }).reduce(function (p, c) {
        return p || (_.findIndex(tags, function (item) {
            // Escape regex special characters
            item = item.replace(/[\-\/\\\^$*+?.()|\[\]{}]/g, '\\$&');
            item = new RegExp('^' + item + '$', 'i');
            return item.test(c);
        }) !== -1);
    }, false);
}

function evaluateAuthorList(expr, author) {
    var authorList = expr.split(',').map(function (v) {
        return v.trim().toLocaleLowerCase();
    });

    return _.includes(authorList, author.toLocaleLowerCase());
}

function evaluateIntegerMatch(expr, integer) {
    var nthMatch = expr.match(/^nth:(\d+)/);
    if (nthMatch) {
        return integer % parseInt(nthMatch[1], 10) === 0;
    }

    return expr.split(',').reduce(function (bool, _integer) {
        return bool || parseInt(_integer, 10) === integer;
    }, false);
}

function evaluateStringMatch(expr, str, ci) {
    if (ci) {
        return expr && str && expr.toLocaleLowerCase() === str.toLocaleLowerCase();
    }

    return expr === str;
}

/**
 *
 * @param {String} type - either some or every - the lodash function to use
 * @param {String} expr - the attribute value passed into {{#has}}
 * @param {Object} obj - "this" context from the helper
 * @param {Object} data - global params
 */
function evaluateList(type, expr, obj, data) {
    return expr.split(',').map(function (prop) {
        return prop.trim().toLocaleLowerCase();
    })[type](function (prop) {
        if (prop.match(/^@/)) {
            return _.has(data, prop.replace(/@/, '')) && !_.isEmpty(_.get(data, prop.replace(/@/, '')));
        } else {
            return _.has(obj, prop) && !_.isEmpty(_.get(obj, prop));
        }
    });
}

module.exports = function has(options) {
    options = options || {};
    options.hash = options.hash || {};
    options.data = options.data || {};

    var self = this,
        attrs = _.pick(options.hash, validAttrs),
        data = _.pick(options.data, ['blog', 'config', 'labs']),
        checks = {
            tag: function () { return attrs.tag && evaluateTagList(attrs.tag, _.map(self.tags, 'name')) || false; },
            author: function () { return attrs.author && evaluateAuthorList(attrs.author, _.get(self, 'author.name')) || false; },
            number: function () { return attrs.number && evaluateIntegerMatch(attrs.number, options.data.number) || false; },
            index: function () { return attrs.index && evaluateIntegerMatch(attrs.index, options.data.index) || false; },
            slug: function () { return attrs.slug && evaluateStringMatch(attrs.slug, self.slug, true) || false; },
            id: function () { return attrs.id && evaluateStringMatch(attrs.id, self.id, true) || false; },
            any: function () { return attrs.any && evaluateList('some', attrs.any, self, data) || false; },
            all: function () { return attrs.all && evaluateList('every', attrs.all, self, data) || false; }
        },
        result;

    if (_.isEmpty(attrs)) {
        logging.warn(i18n.t('warnings.helpers.has.invalidAttribute'));
        return;
    }

    result = _.some(attrs, function (value, attr) {
        return checks[attr]();
    });

    if (result) {
        return options.fn(this);
    }

    return options.inverse(this);
};
