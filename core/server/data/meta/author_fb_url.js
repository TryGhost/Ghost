var getContextObject = require('./context_object.js');

function getAuthorFacebookUrl(data) {
    var context = data.context ? data.context[0] : null,
        contextObject = getContextObject(data, context);

    if ((context === 'post' || context === 'page') && contextObject.author && contextObject.author.facebook) {
        return contextObject.author.facebook;
    } else if (context === 'author' && contextObject.facebook) {
        return contextObject.facebook;
    }
    return null;
}

module.exports = getAuthorFacebookUrl;
