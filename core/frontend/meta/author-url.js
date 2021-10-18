const urlService = require('../../server/services/url');
const getContextObject = require('./context-object.js');

function getAuthorUrl(data, absolute) {
    let context = data.context ? data.context[0] : null;

    const contextObject = getContextObject(data, context);

    if (data.author) {
        return urlService.getUrlByResourceId(data.author.id, {absolute: absolute, secure: data.author.secure, withSubdirectory: true});
    }

    if (contextObject && contextObject.primary_author) {
        return urlService.getUrlByResourceId(contextObject.primary_author.id, {absolute: absolute, secure: contextObject.secure, withSubdirectory: true});
    }

    return null;
}

module.exports = getAuthorUrl;
