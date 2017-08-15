// # Has Helper
// Usage: `{{#has tag="video, music"}}`, `{{#has author="sam, pat"}}`
//
// Checks if a post has a particular property

var proxy = require('./proxy'),
    _ = require('lodash'),
    logging = proxy.logging,
    i18n = proxy.i18n;

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

function evaluateNumberList(expr, number) {
    var nthMatch = expr.match(/^nth:(\d+)/);
    if (nthMatch) {
        return number % parseInt(nthMatch[1], 10) === 0;
    }

    return expr.split(',').reduce(function (bool, _number) {
        return bool || parseInt(_number, 10) === number;
    }, false);
}

module.exports = function has(options) {
    options = options || {};
    options.hash = options.hash || {};

    var tags = _.map(this.tags, 'name'),
        author = this.author ? this.author.name : null,
        number = options.data.number,
        tagList = options.hash.tag || false,
        authorList = options.hash.author || false,
        numberList = options.hash.number || false,
        tagsOk,
        authorOk,
        numberOk;

    if (!tagList && !authorList && !numberList) {
        logging.warn(i18n.t('warnings.helpers.has.invalidAttribute'));
        return;
    }

    tagsOk = tagList && evaluateTagList(tagList, tags) || false;
    authorOk = authorList && evaluateAuthorList(authorList, author) || false;
    numberOk = numberList && evaluateNumberList(numberList, number) || false;

    if (tagsOk || authorOk || numberOk) {
        return options.fn(this);
    }
    return options.inverse(this);
};
