var utils  = require('../../utils'),
    getUrl = require('./url'),
    _      = require('lodash');

function getAmplUrl(data) {
    var context = data.context ? data.context : null;

    if (_.includes(context, 'post') && !_.includes(context, 'amp')) {
        return utils.url.urlJoin(utils.url.urlFor('home', true), getUrl(data, false), 'amp/');
    }
    return null;
}

module.exports = getAmplUrl;
