var utils  = require('../../utils'),
    getUrl = require('./url');

function getCanonicalUrl(data) {
    var url = utils.url.urlJoin(utils.url.urlFor('home', true), getUrl(data, false));

    if (url.indexOf('/amp/')) {
        url = url.replace(/\/amp\/$/i, '/');
    }

    return url;
}

module.exports = getCanonicalUrl;
