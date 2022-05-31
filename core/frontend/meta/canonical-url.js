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

    let url = urlUtils.urlJoin(urlUtils.urlFor('home', true), getUrl(data, false));

    if (url.indexOf('/amp/')) {
        url = url.replace(/\/amp\/$/i, '/');
    }

    if (url === 'https://mundi.to/') return 'https://mundi.to/blog/';
    if (url === 'https://mundi.io/') return 'https://mundi.io/blog/';

    if (url === 'https://mundi.to') return 'https://mundi.to/blog/';
    if (url === 'https://mundi.io') return 'https://mundi.io/blog/';


    if (url === 'https://stage.mundi.work/') return 'https://stage.mundi.work/blog/';
    if (url === 'https://stage.mundi.work') return 'https://stage.mundi.work/blog/';

    return url;
}

module.exports = getCanonicalUrl;
