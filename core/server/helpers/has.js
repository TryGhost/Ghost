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

module.exports = function has(options) {
    options = options || {};
    options.hash = options.hash || {};

    var tags = _.map(this.tags, 'name'),
        author = this.author ? this.author.name : null,
        number = options.data.number,
        index = options.data.index,
        slug = this.slug,
        id = this.id,
        tagList = options.hash.tag || false,
        authorList = options.hash.author || false,
        numberList = options.hash.number || false,
        indexList = options.hash.index || false,
        slugParam = options.hash.slug || false,
        idParam = options.hash.id || false,
        tagsOk,
        authorOk,
        numberOk,
        indexOk,
        slugOk,
        idOk;

    if (!tagList && !authorList && !numberList && !indexList && !slugParam && !idParam) {
        logging.warn(i18n.t('warnings.helpers.has.invalidAttribute'));
        return;
    }

    tagsOk = tagList && evaluateTagList(tagList, tags) || false;
    authorOk = authorList && evaluateAuthorList(authorList, author) || false;
    numberOk = numberList && evaluateIntegerMatch(numberList, number) || false;
    indexOk = indexList && evaluateIntegerMatch(indexList, index) || false;
    slugOk = slugParam && evaluateStringMatch(slugParam, slug, true) || false;
    idOk = idParam && evaluateStringMatch(idParam, id, true) || false;

    if (tagsOk || authorOk || numberOk || indexOk || slugOk || idOk) {
        return options.fn(this);
    }
    return options.inverse(this);
};
