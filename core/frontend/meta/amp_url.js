var urlUtils = require('../../server/lib/url-utils'),
    getUrl = require('./url'),
    _ = require('lodash');

function getAmplUrl(data) {
    var context = data.context ? data.context : null;

    if (_.includes(context, 'post') && !_.includes(context, 'amp')) {
        return urlUtils.urlJoin(urlUtils.urlFor('home', true), getUrl(data, false), 'amp/');
    }
    return null;
}

module.exports = getAmplUrl;
