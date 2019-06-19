var urlUtils = require('../../server/lib/url-utils'),
    getContextObject = require('./context_object.js'),
    _ = require('lodash');

function getCoverImage(data) {
    var context = data.context ? data.context : null,
        contextObject = getContextObject(data, context);

    if (_.includes(context, 'home') || _.includes(context, 'author')) {
        if (contextObject.cover_image) {
            return urlUtils.urlFor('image', {image: contextObject.cover_image}, true);
        }
    } else {
        if (contextObject.feature_image) {
            return urlUtils.urlFor('image', {image: contextObject.feature_image}, true);
        }
    }
    return null;
}

module.exports = getCoverImage;
