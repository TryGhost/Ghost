var config = require('../../config'),
    getUrl = require('./url');

function getCanonicalUrl(data) {
    return config.urlJoin(config.getBaseUrl(false),
        getUrl(data, false));
}

module.exports = getCanonicalUrl;
