var config = require('../../config'),
    trimmedUrlpattern = /.+(?=\/page\/\d*\/)/;

function getPreviousUrl(data, absolute) {
    var trimmedUrl, prev;

    if (data.relativeUrl) {
        trimmedUrl = data.relativeUrl.match(trimmedUrlpattern);
        if (data.pagination && data.pagination.prev) {
            prev = (data.pagination.prev > 1 ? '/page/' + data.pagination.prev + '/' : '/');
            prev = (trimmedUrl) ? trimmedUrl + prev : prev;
            return config.urlFor({relativeUrl: prev, secure: data.secure}, absolute);
        }
    }
    return null;
}

module.exports = getPreviousUrl;
