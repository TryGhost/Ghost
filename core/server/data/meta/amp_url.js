var config = require('../../config'),
    getUrl = require('./url'),
    _      = require('lodash');

function getAmplUrl(data) {
    var context = data.context ? data.context : null;

    if (_.includes(context, 'post') && !_.includes(context, 'amp')) {
        return config.urlJoin(config.getBaseUrl(false),
            getUrl(data, false)) + 'amp/';
    }
    return null;
}

module.exports = getAmplUrl;
