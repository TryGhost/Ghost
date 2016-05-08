var getContextObject = require('./context_object.js');

function getCreatorTwitterUrl(data) {
    var context = data.context ? data.context[0] : null,
        contextObject = getContextObject(data, context);
    if ((context === 'post' || context === 'page') && contextObject.author && contextObject.author.twitter) {
        return contextObject.author.twitter;
    } else if (context === 'author' && contextObject.twitter) {
        return contextObject.twitter;
    }
    return null;
}

module.exports = getCreatorTwitterUrl;
