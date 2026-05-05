const urlService = require('../../server/services/url');
const getContextObject = require('./context-object.js');

function getAuthorUrl(data, absolute) {
    let context = data.context ? data.context[0] : null;

    const contextObject = getContextObject(data, context);

    if (data.author) {
        return urlService.facade.getUrlForResource({...data.author, type: 'authors'}, {absolute: absolute, withSubdirectory: true});
    }

    if (contextObject && contextObject.primary_author) {
        return urlService.facade.getUrlForResource({...contextObject.primary_author, type: 'authors'}, {absolute: absolute, withSubdirectory: true});
    }

    return null;
}

module.exports = getAuthorUrl;
