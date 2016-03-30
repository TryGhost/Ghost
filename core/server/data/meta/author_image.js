var config           = require('../../config'),
    getContextObject = require('./context_object.js');

function getAuthorImage(data, absolute) {
    var context = data.context ? data.context[0] : null,
        contextObject = getContextObject(data, context);

    if ((context === 'post' || context === 'page') && contextObject.author && contextObject.author.image) {
        return config.urlFor('image', {image: contextObject.author.image}, absolute);
    }
    return null;
}

module.exports = getAuthorImage;
