const _ = require('lodash');
const rssCache = require('./cache');

module.exports.render = function render(res, baseUrl, data) {
    // Format data - this is the same as what Express does
    const rssData = _.merge({}, res.locals, data);

    // Fetch RSS from the cache
    return rssCache
        .getXML(baseUrl, rssData)
        .then(function then(feedXml) {
            res.set('Content-Type', 'application/rss+xml; charset=UTF-8');
            res.send(feedXml);
        });
};
