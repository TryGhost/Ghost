var urlService = require('../../services/url'),
    getUrl = require('./url');

function getCanonicalUrl(data) {
    var url = urlService.utils.urlJoin(urlService.utils.urlFor('home', true), getUrl(data, false));

    if (url.indexOf('/amp/')) {
        url = url.replace(/\/amp\/$/i, '/');
    }

    return url;
}

module.exports = getCanonicalUrl;
