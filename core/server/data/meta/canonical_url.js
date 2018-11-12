const urlService = require('../../services/url'),
    getUrl = require('./url');

function getCanonicalUrl(data) {
    let url = urlService.utils.urlJoin(urlService.utils.urlFor('home', true), getUrl(data, false));

    if (url.indexOf('/amp/')) {
        url = url.replace(/\/amp\/$/i, '/');
    }

    return url;
}

module.exports = getCanonicalUrl;
