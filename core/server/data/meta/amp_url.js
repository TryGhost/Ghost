const urlService = require('../../services/url'),
    getUrl = require('./url'),
    _ = require('lodash');

function getAmplUrl(data) {
    let context = data.context ? data.context : null;

    if (_.includes(context, 'post') && !_.includes(context, 'amp')) {
        return urlService.utils.urlJoin(urlService.utils.urlFor('home', true), getUrl(data, false), 'amp/');
    }
    return null;
}

module.exports = getAmplUrl;
