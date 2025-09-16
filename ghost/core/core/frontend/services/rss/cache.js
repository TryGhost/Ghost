const crypto = require('crypto');
const generateFeed = require('./generate-feed');
const logging = require('@tryghost/logging');
const feedCache = {};

module.exports.getXML = function getFeedXml(baseUrl, data, memberUuid) {
    const cacheKey = memberUuid ? `${baseUrl}:${memberUuid}` : baseUrl;
    const dataHash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
    if (!feedCache[cacheKey] || feedCache[cacheKey].hash !== dataHash) {
        // We need to regenerate
        feedCache[cacheKey] = {
            hash: dataHash,
            xml: generateFeed(baseUrl, data)
        };
    } else {
        logging.info('[RSS] Serving from in-memory cache');
    }

    return feedCache[cacheKey].xml;
};
