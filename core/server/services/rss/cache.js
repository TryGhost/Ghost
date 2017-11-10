var crypto = require('crypto'),
    generateFeed = require('./generate-feed'),
    feedCache = {};

module.exports.getXML = function getFeedXml(baseUrl, data) {
    var dataHash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
    if (!feedCache[baseUrl] || feedCache[baseUrl].hash !== dataHash) {
        // We need to regenerate
        feedCache[baseUrl] = {
            hash: dataHash,
            xml: generateFeed(baseUrl, data)
        };
    }

    return feedCache[baseUrl].xml;
};
