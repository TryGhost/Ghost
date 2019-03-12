const _ = require('lodash');
const urlService = require('../../services/url');
const getUrl = require('./url');

function getCanonicalUrl(data) {
    if ((_.includes(data.context, 'post') || _.includes(data.context, 'page'))
        && data.post && data.post.canonical_url) {
        return data.post.canonical_url;
    }

    let url = urlService.utils.urlJoin(urlService.utils.urlFor('home', true), getUrl(data, false));

    if (url.indexOf('/amp/')) {
        url = url.replace(/\/amp\/$/i, '/');
    }

    return url;
}

module.exports = getCanonicalUrl;
