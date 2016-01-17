var config = require('../../config'),
    trimmedUrlpattern = /.+(?=\/page\/\d*\/)/,
    tagOrAuthorPattern = /\/(tag)|(author)\//;

function getNextUrl(data, absolute) {
    var trimmedUrl, next;

    if (data.relativeUrl) {
        trimmedUrl = data.relativeUrl.match(trimmedUrlpattern);
        if (data.pagination && data.pagination.next) {
            next = '/page/' + data.pagination.next + '/';
            if (trimmedUrl) {
                next = trimmedUrl + next;
            } else if (tagOrAuthorPattern.test(data.relativeUrl)) {
                next = data.relativeUrl.slice(0, -1) + next;
            }
            return config.urlFor({relativeUrl: next, secure: data.secure}, absolute);
        }
    }
    return null;
}

module.exports = getNextUrl;
