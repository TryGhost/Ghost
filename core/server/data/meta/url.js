var schema = require('../schema').checks,
    urlService = require('../../services/url');

// This cleans the url from any `/amp` postfixes, so we'll never
// output a url with `/amp` in the end, except for the needed `amphtml`
// canonical link, which is rendered by `getAmpUrl`.
function sanitizeAmpUrl(url) {
    if (url.indexOf('/amp/') !== -1) {
        url = url.replace(/\/amp\/$/i, '/');
    }
    return url;
}

function getUrl(data, absolute) {
    if (schema.isPost(data) || schema.isTag(data) || schema.isUser(data)) {
        return urlService.getUrlByResourceId(data.id, {secure: data.secure, absolute: absolute, withSubdirectory: true});
    }

    if (schema.isNav(data)) {
        return urlService.utils.urlFor('nav', {nav: data, secure: data.secure}, absolute);
    }

    // sanitize any trailing `/amp` in the url
    return sanitizeAmpUrl(urlService.utils.urlFor(data, {}, absolute));
}

module.exports = getUrl;
