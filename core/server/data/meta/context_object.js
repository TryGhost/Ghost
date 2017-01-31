var settingsCache = require('../../api/settings').cache,
    _ = require('lodash');

function getContextObject(data, context) {
    /**
     * @TODO:
     *   - the only valid property is cover
     *   - there was no image property in config.get('theme')
     *   - there was no author property in config.get('theme')
     */
    var blog = {
            cover: settingsCache.get('cover')
        },
        contextObject;

    context = _.includes(context, 'page') || _.includes(context, 'amp') ? 'post' : context;
    contextObject = data[context] || blog;
    return contextObject;
}

module.exports = getContextObject;
