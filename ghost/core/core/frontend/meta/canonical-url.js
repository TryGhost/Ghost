const _ = require('lodash');
const urlUtils = require('../../shared/url-utils');
const getUrl = require('./url');

function getCanonicalUrl(data) {
    if ((_.includes(data.context, 'post') || _.includes(data.context, 'page'))
        && data.post && data.post.canonical_url) {
        return data.post.canonical_url;
    }

    if (_.includes(data.context, 'tag') && data.tag && data.tag.canonical_url) {
        return data.tag.canonical_url;
    }

    return urlUtils.urlJoin(urlUtils.urlFor('home', true), getUrl(data, false));
}

module.exports = getCanonicalUrl;
