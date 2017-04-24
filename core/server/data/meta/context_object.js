var settingsCache = require('../../settings/cache'),
    _ = require('lodash');

function getContextObject(data, context) {
    /**
     * If the data object does not contain the requested context, we return the fallback object.
     */
    var blog = {
            cover_image: settingsCache.get('cover_image'),
            twitter: settingsCache.get('twitter'),
            facebook: settingsCache.get('facebook')
        },
        contextObject;

    context = _.includes(context, 'page') || _.includes(context, 'amp') ? 'post' : context;
    contextObject = data[context] || blog;
    return contextObject;
}

module.exports = getContextObject;
