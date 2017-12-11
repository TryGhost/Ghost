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
    if (schema.isPost(data)) {
        return urlService.utils.urlFor('post', {post: data, secure: data.secure}, absolute);
    }

    if (schema.isTag(data)) {
        return urlService.utils.urlFor('tag', {tag: data, secure: data.secure}, absolute);
    }

    if (schema.isUser(data)) {
        return urlService.utils.urlFor('author', {author: data, secure: data.secure}, absolute);
    }

    if (schema.isNav(data)) {
        return urlService.utils.urlFor('nav', {nav: data, secure: data.secure}, absolute);
    }

    // sanitize any trailing `/amp` in the url
    return sanitizeAmpUrl(urlService.utils.urlFor(data, {}, absolute));
}

module.exports = getUrl;
