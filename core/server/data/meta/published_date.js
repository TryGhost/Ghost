const _ = require('lodash'),
    getContextObject = require('./context_object.js');

function getPublishedDate(data) {
    let context = data.context ? data.context : null,
        contextObject = getContextObject(data, context),
        pubDate = _.get(contextObject, 'published_at');

    if (pubDate) {
        return new Date(pubDate).toISOString();
    }
    return null;
}

module.exports = getPublishedDate;
