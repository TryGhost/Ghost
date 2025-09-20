const crypto = require('crypto');
const generateFeed = require('./generate-feed');
const logging = require('@tryghost/logging');
const feedCache = {};

module.exports.getXML = function getFeedXml(baseUrl, data, memberUuid) {
    // Create member-specific cache key if member is authenticated
    const cacheKey = memberUuid ? `${baseUrl}:member:${memberUuid}` : baseUrl;

    const dataHash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
    if (!feedCache[cacheKey] || feedCache[cacheKey].hash !== dataHash) {
        // We need to regenerate
        feedCache[cacheKey] = {
            hash: dataHash,
            xml: generateFeed(baseUrl, data)
        };
        logging.info(`[RSS] Generated ${memberUuid ? 'member-specific' : 'public'} RSS feed`);
    } else {
        logging.info(`[RSS] Serving ${memberUuid ? 'member-specific' : 'public'} RSS from in-memory cache`);
    }

    return feedCache[cacheKey].xml;
};
