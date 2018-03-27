var getContextObject = require('./context_object.js'),
    _                = require('lodash');

function getCreatorTwitterUrl(data) {
    var context = data.context ? data.context : null,
        contextObject = getContextObject(data, context);

    if ((_.includes(context, 'post') || _.includes(context, 'page')) && contextObject.primary_author && contextObject.primary_author.twitter) {
        return contextObject.primary_author.twitter;
    } else if (_.includes(context, 'author') && contextObject.twitter) {
        return contextObject.twitter;
    }
    return null;
}

module.exports = getCreatorTwitterUrl;
