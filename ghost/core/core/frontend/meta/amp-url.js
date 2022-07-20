const urlUtils = require('../../shared/url-utils');
const getUrl = require('./url');
const _ = require('lodash');

function getAmplUrl(data) {
    const context = data.context ? data.context : null;

    if (_.includes(context, 'post') && !_.includes(context, 'amp')) {
        return urlUtils.urlJoin(urlUtils.urlFor('home', true), getUrl(data, false), 'amp/');
    }
    return null;
}

module.exports = getAmplUrl;
