const getContextObject = require('./context_object.js');
const _ = require('lodash');

function getCreatorTwitterUrl(data) {
    const context = data.context ? data.context : null;
    const contextObject = getContextObject(data, context);

    if ((_.includes(context, 'post') || _.includes(context, 'page')) && contextObject.primary_author && contextObject.primary_author.twitter) {
        return contextObject.primary_author.twitter;
    } else if (_.includes(context, 'author') && contextObject.twitter) {
        return contextObject.twitter;
    }
    return null;
}

module.exports = getCreatorTwitterUrl;
