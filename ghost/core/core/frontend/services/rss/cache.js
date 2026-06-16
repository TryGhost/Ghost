const crypto = require('crypto');
const logging = require('@tryghost/logging');
const feedCache = {};

const _private = {
    generateFeed: require('./generate-feed')
};

/**
 * @returns {string}
 */
module.exports.getXML = function getFeedXml(baseUrl, data) {
    const dataHash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
    if (!feedCache[baseUrl] || feedCache[baseUrl].hash !== dataHash) {
        // We need to regenerate
        feedCache[baseUrl] = {
            hash: dataHash,
            xml: _private.generateFeed(baseUrl, data)
        };
    } else {
        logging.info('[RSS] Serving from in-memory cache');
    }

    return feedCache[baseUrl].xml;
};

module.exports._private = _private;
