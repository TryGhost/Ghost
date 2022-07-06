const getContextObject = require('./context-object.js');

function getPublishedDate(data) {
    let context = data.context ? data.context[0] : null;

    const contextObject = getContextObject(data, context);

    if (contextObject && contextObject.published_at) {
        return new Date(contextObject.published_at).toISOString();
    }
    return null;
}

module.exports = getPublishedDate;
