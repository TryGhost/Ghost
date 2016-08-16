var config           = require('../../config'),
    getContextObject = require('./context_object.js'),
    _                = require('lodash');

function getCoverImage(data) {
    var context = data.context ? data.context : null,
        contextObject = getContextObject(data, context);

    if (_.includes(context, 'home') || _.includes(context, 'author')) {
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
