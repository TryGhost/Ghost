var _ = require('lodash'),
    rssCache = require('./cache');

module.exports.render = function render(res, baseUrl, data) {
    // Format data - this is the same as what Express does
    var rssData = _.merge({}, res.locals, data);

    // Fetch RSS from the cache
    return rssCache
        .getXML(baseUrl, rssData)
        .then(function then(feedXml) {
            res.set('Content-Type', 'text/xml; charset=UTF-8');
            res.send(feedXml);
        });
};
