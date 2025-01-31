const _ = require('lodash');
const urlUtils = require('../../shared/url-utils');
const getUrl = require('./url');
const {fixAnyNonStandardChars} = require('./utils');

function getCanonicalUrl(data) {
    if ((_.includes(data.context, 'post') || _.includes(data.context, 'page'))
        && data.post && data.post.canonical_url) {
        return data.post.canonical_url;
    }

    if (_.includes(data.context, 'tag') && data.tag && data.tag.canonical_url) {
        return data.tag.canonical_url;
    }

    let url = urlUtils.urlJoin(urlUtils.urlFor('home', true), getUrl(data, false));

    if (url.indexOf('/amp/')) {
        url = url.replace(/\/amp\/$/i, '/');
    }
    // fix any urls with unexpected accented characters
    url = fixAnyNonStandardChars(url);
    
    return url;
}

module.exports = getCanonicalUrl;
