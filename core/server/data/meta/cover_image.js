var config           = require('../../config'),
    getContextObject = require('./context_object.js');

function getCoverImage(data) {
    var context = data.context ? data.context[0] : null,
        contextObject = getContextObject(data, context);

    if (context === 'home' || context === 'author') {
        if (contextObject.cover) {
            return config.urlFor('image', {image: contextObject.cover}, true);
        }
    } else {
        if (contextObject.image) {
            return config.urlFor('image', {image: contextObject.image}, true);
        }
    }
    return null;
}

module.exports = getCoverImage;
